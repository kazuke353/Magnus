import { useState, useEffect } from 'react';
import { json, LoaderFunctionArgs } from '@remix-run/node'; // Import LoaderFunctionArgs
import { useLoaderData, useFetcher } from '@remix-run/react';
// Correctly import requireAuthentication
import { requireAuthentication } from '~/services/auth.server';
import WatchlistPanel from '~/components/WatchlistPanel';
import { WatchlistItem } from '~/utils/portfolio/types';
import { sortWatchlist, filterWatchlist } from '~/utils/portfolio/watchlist';
// Import error handling utilities
import { errorResponse, createApiError, handleError } from "~/utils/error-handler";
import Card from '~/components/Card'; // Import Card for error display

// Define type for loader data
interface WatchlistLoaderData {
  watchlist: WatchlistItem[];
  currency: string;
  error?: { message: string; details?: any };
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<Response | TypedResponse<WatchlistLoaderData>> => { // Use LoaderFunctionArgs and add return type
  try {
    // Use requireAuthentication to get the user object
    const user = await requireAuthentication(request, "/login");
    const userId = user.id; // Get userId from the authenticated user
    const userCurrency = user.settings?.currency || 'USD'; // Get currency from user settings

    // Fetch watchlist data from the internal API endpoint
    // Ensure the request includes necessary authentication cookies
    const apiResponse = await fetch(`${new URL(request.url).origin}/api/portfolio/watchlist`, {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.json().catch(() => ({}));
      throw createApiError(
        `Failed to fetch watchlist: ${apiResponse.statusText}`,
        apiResponse.status,
        errorBody
      );
    }

    const data = await apiResponse.json();

    return json({
      watchlist: data.watchlist || [],
      currency: userCurrency,
      error: data.error ? { message: data.error } : undefined // Pass API error if present
    });

  } catch (error) {
    // Handle potential redirects or errors from requireAuthentication/API fetch
     if (error instanceof Response) {
       throw error; // Re-throw redirects
     }
     console.error('Error loading watchlist page:', error);
     const apiError = handleError(error); // Use your error handler
     // Return the error in the expected structure
     return json(
         { watchlist: [], currency: 'USD', error: { message: apiError.message, details: apiError.details } },
         { status: apiError.status }
     );
  }
};

export default function WatchlistPage() {
  // Adjust destructuring to handle potential error object
  const { watchlist: initialWatchlist, currency, error } = useLoaderData<WatchlistLoaderData>();

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(initialWatchlist || []); // Default to empty array if initial is null/undefined
  const [sortBy, setSortBy] = useState<keyof WatchlistItem>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState(''); // Keep search term state if needed by WatchlistPanel
  const [isLoading, setIsLoading] = useState(false);

  const watchlistFetcher = useFetcher();

  // Update local state when loader data changes (check for error first)
  useEffect(() => {
    if (!error) {
      setWatchlist(initialWatchlist || []);
    }
  }, [initialWatchlist, error]);

  // --- Action Handlers remain the same ---
  const handleAddToWatchlist = (instrument: any, notes?: string, targetPrice?: number) => {
    setIsLoading(true);
    watchlistFetcher.submit(
      {
        _action: 'add', // Use _action convention
        instrument,
        notes,
        targetPrice
      },
      {
        method: 'post',
        action: '/api/portfolio/watchlist', // Target the API route
        encType: 'application/json' // Send as JSON
      }
    );
  };

  const handleRemoveFromWatchlist = (ticker: string) => {
    setIsLoading(true);
    watchlistFetcher.submit(
      {
        _action: 'remove', // Use _action convention
        ticker
      },
      {
        method: 'post',
        action: '/api/portfolio/watchlist', // Target the API route
        encType: 'application/json' // Send as JSON
      }
    );
  };

   const handleUpdateWatchlistItem = (ticker: string, updates: Partial<WatchlistItem>) => {
     setIsLoading(true);
     watchlistFetcher.submit(
       {
         _action: 'update', // Use _action convention
         ticker,
         updates
       },
       {
         method: 'post',
         action: '/api/portfolio/watchlist', // Target the API route
         encType: 'application/json' // Send as JSON
       }
     );
   };

  const handleRefresh = () => {
    setIsLoading(true);
    // Use Remix's standard way to reload data for the current route
    watchlistFetcher.load(window.location.pathname);
  };

  // Update local state when fetcher completes
  useEffect(() => {
    // Check specifically for data relevant to this page/fetcher
    if (watchlistFetcher.data && watchlistFetcher.state === 'idle') {
      // Check if the fetcher data contains a watchlist (e.g., after add/remove/update/refresh)
      if (watchlistFetcher.data.watchlist) {
        setWatchlist(watchlistFetcher.data.watchlist);
      } else if (watchlistFetcher.data.error) {
         // Handle errors returned by the fetcher action
         console.error("Watchlist action error:", watchlistFetcher.data.error);
         // Optionally show a toast message here
      }
      setIsLoading(false);
    } else if (watchlistFetcher.state === 'loading') {
       setIsLoading(true);
    } else if (watchlistFetcher.state === 'idle') {
       // Fetcher finished but might not have relevant data (e.g., initial load)
       setIsLoading(false);
    }
  }, [watchlistFetcher.data, watchlistFetcher.state]);

  // Apply sorting and filtering (Keep this logic if WatchlistPanel doesn't handle it)
  const displayedWatchlist = filterWatchlist(
    sortWatchlist(watchlist, sortBy, sortDirection === 'asc'),
    searchTerm // Assuming WatchlistPanel uses searchTerm prop or handles search internally
  );

  // Render error state if loader failed
  if (error) {
     return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-red-600 dark:text-red-400">Error Loading Watchlist</h1>
            <Card>
               <p className="p-4 text-red-700 dark:text-red-300">{error.message}</p>
               {error.details && <pre className="p-4 bg-red-50 dark:bg-red-900/20 text-xs overflow-auto">{JSON.stringify(error.details, null, 2)}</pre>}
            </Card>
        </div>
     )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Watchlist</h1>

      {/* Pass handlers and state down to WatchlistPanel */}
      <WatchlistPanel
        watchlist={displayedWatchlist}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
        onUpdateWatchlistItem={handleUpdateWatchlistItem}
        onRefresh={handleRefresh} // You might trigger a Remix navigation reload instead
        isLoading={isLoading}
        currency={currency}
        // You might need to pass searchTerm and setSortBy/setSortDirection if Panel doesn't manage state
      />
    </div>
  );
}