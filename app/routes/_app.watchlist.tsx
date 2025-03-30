import { useState, useEffect } from 'react';
import { json } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { requireUserId } from '~/services/auth.server';
import WatchlistPanel from '~/components/WatchlistPanel';
import { WatchlistItem } from '~/utils/portfolio/types';
import { sortWatchlist, filterWatchlist } from '~/utils/portfolio/watchlist';

export const loader = async ({ request }: { request: Request }) => {
  const userId = await requireUserId(request);
  
  try {
    // Fetch watchlist data from API
    const response = await fetch(`${new URL(request.url).origin}/api/portfolio/watchlist`, {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch watchlist: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return json({
      watchlist: data.watchlist || [],
      currency: 'USD' // Default currency
    });
  } catch (error) {
    console.error('Error loading watchlist:', error);
    return json({
      watchlist: [],
      currency: 'USD',
      error: 'Failed to load watchlist'
    });
  }
};

export default function WatchlistPage() {
  const { watchlist: initialWatchlist, currency, error } = useLoaderData<{
    watchlist: WatchlistItem[];
    currency: string;
    error?: string;
  }>();
  
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(initialWatchlist);
  const [sortBy, setSortBy] = useState<keyof WatchlistItem>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const watchlistFetcher = useFetcher();
  
  // Update local state when loader data changes
  useEffect(() => {
    setWatchlist(initialWatchlist);
  }, [initialWatchlist]);
  
  // Handle adding instrument to watchlist
  const handleAddToWatchlist = (instrument: any, notes?: string, targetPrice?: number) => {
    setIsLoading(true);
    
    watchlistFetcher.submit(
      {
        action: 'add',
        instrument,
        notes,
        targetPrice
      },
      {
        method: 'post',
        action: '/api/portfolio/watchlist',
        encType: 'application/json'
      }
    );
  };
  
  // Handle removing instrument from watchlist
  const handleRemoveFromWatchlist = (ticker: string) => {
    setIsLoading(true);
    
    watchlistFetcher.submit(
      {
        action: 'remove',
        ticker
      },
      {
        method: 'post',
        action: '/api/portfolio/watchlist',
        encType: 'application/json'
      }
    );
  };
  
  // Handle updating watchlist item
  const handleUpdateWatchlistItem = (ticker: string, updates: Partial<WatchlistItem>) => {
    setIsLoading(true);
    
    watchlistFetcher.submit(
      {
        action: 'update',
        ticker,
        updates
      },
      {
        method: 'post',
        action: '/api/portfolio/watchlist',
        encType: 'application/json'
      }
    );
  };
  
  // Handle refreshing watchlist data
  const handleRefresh = () => {
    setIsLoading(true);
    watchlistFetcher.load('/api/portfolio/watchlist');
  };
  
  // Update local state when fetcher completes
  useEffect(() => {
    if (watchlistFetcher.data && watchlistFetcher.state === 'idle') {
      if (watchlistFetcher.data.watchlist) {
        setWatchlist(watchlistFetcher.data.watchlist);
      }
      setIsLoading(false);
    }
  }, [watchlistFetcher.data, watchlistFetcher.state]);
  
  // Apply sorting and filtering
  const displayedWatchlist = filterWatchlist(
    sortWatchlist(watchlist, sortBy, sortDirection === 'asc'),
    searchTerm
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Watchlist</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <WatchlistPanel
        watchlist={displayedWatchlist}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
        onUpdateWatchlistItem={handleUpdateWatchlistItem}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        currency={currency}
      />
    </div>
  );
}
