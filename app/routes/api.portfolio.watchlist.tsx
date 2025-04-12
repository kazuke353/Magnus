import { json, ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import type { ActionFunction, LoaderFunction, TypedResponse } from '@remix-run/node';
import { requireAuthentication } from '~/services/auth.server';
import { getWatchlist, saveWatchlist } from '~/services/portfolio.server';
import { WatchlistItem } from '~/utils/portfolio/types';
import { addToWatchlist, removeFromWatchlist, updateWatchlistItem } from '~/utils/portfolio/watchlist';
import { createApiError, handleError, createValidationError } from "~/utils/error-handler";
// Import Zod schemas
import { WatchlistAddSchema, WatchlistRemoveSchema, WatchlistUpdateSchema } from '~/utils/validation';

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

// --- Loader Function (No input validation needed here) ---
export const loader: LoaderFunction = async ({ request }: LoaderFunctionArgs): Promise<TypedResponse<WatchlistApiLoaderData>> => {
  try {
    const user = await requireAuthentication(request);
    const userId = user.id;
    const watchlist = await getWatchlist(userId);
    // Select only necessary fields before returning
    const filteredWatchlist = watchlist.map(item => ({
        ticker: item.ticker,
        name: item.name,
        exchange: item.exchange,
        type: item.type,
        currentPrice: item.currentPrice, // Keep price if needed for display
        targetPrice: item.targetPrice,
        alertEnabled: item.alertEnabled,
        notes: item.notes,
        // Omit fields like addedOn, maxOpenQuantity, minTradeQuantity unless needed by client
    }));
    return json({ watchlist: filteredWatchlist });

  } catch (error) {
     if (error instanceof Response) { throw error; }
     console.error('API Watchlist Loader Error:', error);
     const apiError = handleError(error);
     return json(
         { watchlist: [], error: { message: apiError.message, details: apiError.details } },
         { status: apiError.status }
     );
  }
};

// --- Action Function (Add input validation) ---
export const action: ActionFunction = async ({ request }: ActionFunctionArgs): Promise<TypedResponse<WatchlistApiActionData>> => {
  try {
    const user = await requireAuthentication(request);
    const userId = user.id;

    if (request.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const payload = await request.json();

    if (!payload || !payload._action) {
      return json(createValidationError("Invalid request data: Missing _action"), { status: 400 });
    }

    const { _action } = payload;

    let currentWatchlist = await getWatchlist(userId);
    let updatedWatchlist: WatchlistItem[] = [...currentWatchlist];
    let message = '';
    let validationResult;

    switch (_action) {
      case 'add': {
        validationResult = WatchlistAddSchema.safeParse(payload);
        if (!validationResult.success) {
          return json(createValidationError("Invalid data for adding watchlist item.", validationResult.error.flatten().fieldErrors), { status: 400 });
        }
        const { instrument, notes, targetPrice } = validationResult.data;
        // Construct newItem using validated data
        const newItem: WatchlistItem = {
            ticker: instrument.ticker,
            name: instrument.name,
            exchange: instrument.exchange,
            type: instrument.type,
            currencyCode: instrument.currencyCode || 'USD', // Default if not provided
            addedOn: new Date().toISOString(), // Set server-side
            maxOpenQuantity: 10000, // Default
            minTradeQuantity: 1, // Default
            addedToWatchlist: new Date().toISOString(), // Set server-side
            notes: notes || undefined,
            targetPrice: targetPrice || undefined,
            alertEnabled: !!targetPrice,
            // Add other fields with defaults if necessary
            sector: instrument.sector,
            industry: instrument.industry,
            marketCap: instrument.marketCap,
            currentPrice: instrument.currentPrice,
            dividendYield: instrument.dividendYield,
            peRatio: instrument.peRatio,
            beta: instrument.beta,
            fiftyTwoWeekHigh: instrument.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: instrument.fiftyTwoWeekLow,
        };
        updatedWatchlist = addToWatchlist(currentWatchlist, newItem);
        message = 'Instrument added to watchlist';
        break;
      }

      case 'remove': {
        validationResult = WatchlistRemoveSchema.safeParse(payload);
        if (!validationResult.success) {
          return json(createValidationError("Invalid data for removing watchlist item.", validationResult.error.flatten().fieldErrors), { status: 400 });
        }
        const { ticker } = validationResult.data;
        updatedWatchlist = removeFromWatchlist(currentWatchlist, ticker);
        message = 'Instrument removed from watchlist';
        break;
      }

      case 'update': {
        validationResult = WatchlistUpdateSchema.safeParse(payload);
        if (!validationResult.success) {
          return json(createValidationError("Invalid data for updating watchlist item.", validationResult.error.flatten().fieldErrors), { status: 400 });
        }
        const { ticker, updates } = validationResult.data;
        updatedWatchlist = updateWatchlistItem(currentWatchlist, ticker, updates);
        message = 'Watchlist item updated';
        break;
      }

      default:
        return json(createValidationError('Invalid action type'), { status: 400 });
    }

    // Save the entire updated watchlist back to the database
    const saveSuccess = await saveWatchlist(userId, updatedWatchlist);
    if (!saveSuccess) {
      throw createApiError('Failed to save updated watchlist to the database', 500);
    }

     // Filter data before returning
     const filteredUpdatedWatchlist = updatedWatchlist.map(item => ({
        ticker: item.ticker,
        name: item.name,
        exchange: item.exchange,
        type: item.type,
        currentPrice: item.currentPrice,
        targetPrice: item.targetPrice,
        alertEnabled: item.alertEnabled,
        notes: item.notes,
    }));

    return json({
      success: true,
      message: message,
      watchlist: filteredUpdatedWatchlist // Return filtered updated list
    });

  } catch (error) {
     if (error instanceof Response) { throw error; }
     console.error('API Watchlist Action Error:', error);
     const apiError = handleError(error);
     return json(
         { success: false, error: apiError.message, details: apiError.details },
         { status: apiError.status }
     );
  }
};
