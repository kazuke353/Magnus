    import { useState, useEffect } from 'react';
    import { json, LoaderFunctionArgs } from '@remix-run/node';
    import { useLoaderData, useFetcher } from '@remix-run/react';
    import { requireAuthentication } from '~/services/auth.server';
    import WatchlistPanel from '~/components/WatchlistPanel';
    import WatchlistItemDetail from '~/components/WatchlistItemDetail'; // Import the new detail component
    import { WatchlistItem } from '~/utils/portfolio/types';
    import { sortWatchlist, filterWatchlist } from '~/utils/portfolio/watchlist';
    import { errorResponse, createApiError, handleError } from "~/utils/error-handler";
    import Card from '~/components/Card';

    interface WatchlistLoaderData {
      watchlist: WatchlistItem[];
      currency: string;
      error?: { message: string; details?: any };
    }

    export const loader = async ({ request }: LoaderFunctionArgs): Promise<Response | TypedResponse<WatchlistLoaderData>> => {
      try {
        const user = await requireAuthentication(request);
        const userId = user.id;
        const userCurrency = user.settings?.currency || 'USD';

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
          error: data.error ? { message: data.error } : undefined
        });

      } catch (error) {
         if (error instanceof Response) {
           throw error;
         }
         console.error('Error loading watchlist page:', error);
         const apiError = handleError(error);
         return json(
             { watchlist: [], currency: 'USD', error: { message: apiError.message, details: apiError.details } },
             { status: apiError.status }
         );
      }
    };

    export default function WatchlistPage() {
      const { watchlist: initialWatchlist, currency, error } = useLoaderData<WatchlistLoaderData>();

      const [watchlist, setWatchlist] = useState<WatchlistItem[]>(initialWatchlist || []);
      const [sortBy, setSortBy] = useState<keyof WatchlistItem>('name');
      const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
      const [searchTerm, setSearchTerm] = useState('');
      const [isLoading, setIsLoading] = useState(false);
      const [selectedTicker, setSelectedTicker] = useState<string | null>(null); // State for selected item

      const watchlistFetcher = useFetcher();

      useEffect(() => {
        if (!error) {
          setWatchlist(initialWatchlist || []);
        }
      }, [initialWatchlist, error]);

      const handleAddToWatchlist = (instrument: any, notes?: string, targetPrice?: number) => {
        setIsLoading(true);
        watchlistFetcher.submit(
          { _action: 'add', instrument, notes, targetPrice },
          { method: 'post', action: '/api/portfolio/watchlist', encType: 'application/json' }
        );
      };

      const handleRemoveFromWatchlist = (ticker: string) => {
        setIsLoading(true);
        watchlistFetcher.submit(
          { _action: 'remove', ticker },
          { method: 'post', action: '/api/portfolio/watchlist', encType: 'application/json' }
        );
        // If the removed item was selected, go back to the list view
        if (selectedTicker === ticker) {
          setSelectedTicker(null);
        }
      };

      const handleUpdateWatchlistItem = (ticker: string, updates: Partial<WatchlistItem>) => {
         setIsLoading(true);
         watchlistFetcher.submit(
           { _action: 'update', ticker, updates },
           { method: 'post', action: '/api/portfolio/watchlist', encType: 'application/json' }
         );
       };

      const handleRefresh = () => {
        setIsLoading(true);
        watchlistFetcher.load(window.location.pathname);
        setSelectedTicker(null); // Go back to list view on refresh
      };

      // Handler for selecting an item
      const handleSelectItem = (ticker: string) => {
        setSelectedTicker(ticker);
      };

      // Handler to go back from detail view
      const handleBackToList = () => {
        setSelectedTicker(null);
      };

      useEffect(() => {
        if (watchlistFetcher.data && watchlistFetcher.state === 'idle') {
          if (watchlistFetcher.data.watchlist) {
            setWatchlist(watchlistFetcher.data.watchlist);
          } else if (watchlistFetcher.data.error) {
             console.error("Watchlist action error:", watchlistFetcher.data.error);
          }
          setIsLoading(false);
        } else if (watchlistFetcher.state === 'loading') {
           setIsLoading(true);
        } else if (watchlistFetcher.state === 'idle') {
           setIsLoading(false);
        }
      }, [watchlistFetcher.data, watchlistFetcher.state]);

      const displayedWatchlist = filterWatchlist(
        sortWatchlist(watchlist, sortBy, sortDirection === 'asc'),
        searchTerm
      );

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
          {selectedTicker ? (
            // Show Detail View
            <WatchlistItemDetail
              ticker={selectedTicker}
              currency={currency}
              onBack={handleBackToList}
              onRemove={handleRemoveFromWatchlist} // Pass remove handler
              onUpdate={handleUpdateWatchlistItem} // Pass update handler
            />
          ) : (
            // Show List View (WatchlistPanel)
            <>
              <h1 className="text-2xl font-bold mb-6">Watchlist</h1>
              <WatchlistPanel
                watchlist={displayedWatchlist}
                onAddToWatchlist={handleAddToWatchlist}
                onRemoveFromWatchlist={handleRemoveFromWatchlist}
                onUpdateWatchlistItem={handleUpdateWatchlistItem}
                onRefresh={handleRefresh}
                isLoading={isLoading}
                currency={currency}
                onSelectItem={handleSelectItem} // Pass the select handler
              />
            </>
          )}
        </div>
      );
    }
