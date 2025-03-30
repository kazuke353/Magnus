import { json, ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'; // Import correct types
import type { ActionFunction, LoaderFunction, TypedResponse } from '@remix-run/node'; // Add TypedResponse
import { requireAuthentication } from '~/services/auth.server'; // Use requireAuthentication
import { getWatchlist, saveWatchlist } from '~/services/portfolio.server'; // Import DB functions
import { WatchlistItem } from '~/utils/portfolio/types';
// Import utility functions for modifying the list in memory before saving
import { addToWatchlist, removeFromWatchlist, updateWatchlistItem } from '~/utils/portfolio/watchlist';
import { createApiError, handleError } from "~/utils/error-handler"; // Import error handling

// Define expected types for loader and action data
interface WatchlistApiLoaderData {
  watchlist: WatchlistItem[];
  error?: { message: string; details?: any };
}
interface WatchlistApiActionData {
  success: boolean;
  watchlist?: WatchlistItem[];
  message?: string;
  error?: string;
  details?: any;
}

// --- Refactored Loader Function ---
export const loader: LoaderFunction = async ({ request }: LoaderFunctionArgs): Promise<TypedResponse<WatchlistApiLoaderData>> => {
  try {
    const user = await requireAuthentication(request, "/login");
    const userId = user.id;

    // Get watchlist from the database service
    const watchlist = await getWatchlist(userId);
    return json({ watchlist });

  } catch (error) {
     if (error instanceof Response) {
       throw error; // Re-throw redirects
     }
     console.error('API Watchlist Loader Error:', error);
     const apiError = handleError(error);
     return json(
         { watchlist: [], error: { message: apiError.message, details: apiError.details } },
         { status: apiError.status }
     );
  }
};

// --- Refactored Action Function ---
export const action: ActionFunction = async ({ request }: ActionFunctionArgs): Promise<TypedResponse<WatchlistApiActionData>> => {
  try {
    const user = await requireAuthentication(request, "/login");
    const userId = user.id;

    if (request.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const payload = await request.json();

    if (!payload || !payload._action) {
      return json({ success: false, error: 'Invalid request data: Missing _action' }, { status: 400 });
    }

    const { _action } = payload;

    // Fetch current watchlist from DB first
    let currentWatchlist = await getWatchlist(userId);
    let updatedWatchlist: WatchlistItem[] = [...currentWatchlist]; // Create a mutable copy
    let message = '';

    switch (_action) {
      case 'add': {
        const { instrument, notes, targetPrice } = payload;
        if (!instrument || !instrument.ticker) {
          return json({ success: false, error: 'Invalid instrument data for add action' }, { status: 400 });
        }
        const newItem: WatchlistItem = {
            ...instrument, // Spread instrument details fetched from search/details API
            addedToWatchlist: new Date().toISOString(),
            notes: notes || undefined,
            targetPrice: targetPrice || undefined,
            alertEnabled: !!targetPrice,
            // Ensure all required WatchlistItem fields are present, adding defaults if needed
             currencyCode: instrument.currencyCode || 'USD',
             type: instrument.type || 'EQUITY',
             addedOn: instrument.addedOn || new Date().toISOString(),
             maxOpenQuantity: instrument.maxOpenQuantity || 10000,
             minTradeQuantity: instrument.minTradeQuantity || 1,
        };
        updatedWatchlist = addToWatchlist(currentWatchlist, newItem);
        message = 'Instrument added to watchlist';
        break;
      }

      case 'remove': {
        const { ticker } = payload;
        if (!ticker) {
          return json({ success: false, error: 'Ticker is required for remove action' }, { status: 400 });
        }
        updatedWatchlist = removeFromWatchlist(currentWatchlist, ticker);
        message = 'Instrument removed from watchlist';
        break;
      }

      case 'update': {
        const { ticker, updates } = payload;
        if (!ticker || !updates) {
          return json({ success: false, error: 'Ticker and updates are required for update action' }, { status: 400 });
        }
        updatedWatchlist = updateWatchlistItem(currentWatchlist, ticker, updates);
        message = 'Watchlist item updated';
        break;
      }

      default:
        return json({ success: false, error: 'Invalid action type' }, { status: 400 });
    }

    // Save the entire updated watchlist back to the database
    const saveSuccess = await saveWatchlist(userId, updatedWatchlist);
    if (!saveSuccess) {
      throw createApiError('Failed to save updated watchlist to the database', 500);
    }

    return json({
      success: true,
      message: message,
      watchlist: updatedWatchlist // Return the updated list
    });

  } catch (error) {
     if (error instanceof Response) {
       throw error; // Re-throw redirects
     }
     console.error('API Watchlist Action Error:', error);
     const apiError = handleError(error);
     return json(
         { success: false, error: apiError.message, details: apiError.details },
         { status: apiError.status }
     );
  }
};