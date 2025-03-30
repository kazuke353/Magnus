import { json } from '@remix-run/node';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { requireUserId } from '~/services/auth.server';
import { WatchlistItem } from '~/utils/portfolio/types';

// In-memory storage for watchlist (in a real app, this would be in a database)
let watchlistStore: Record<string, WatchlistItem[]> = {};

export const action: ActionFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  
  if (request.method === 'POST') {
    try {
      const formData = await request.json();
      
      if (!formData || !formData.action) {
        return json({ error: 'Invalid request data' }, { status: 400 });
      }
      
      // Initialize user's watchlist if it doesn't exist
      if (!watchlistStore[userId]) {
        watchlistStore[userId] = [];
      }
      
      const { action } = formData;
      
      if (action === 'add') {
        const { instrument, notes, targetPrice } = formData;
        
        if (!instrument || !instrument.ticker) {
          return json({ error: 'Invalid instrument data' }, { status: 400 });
        }
        
        // Check if instrument is already in watchlist
        const existingIndex = watchlistStore[userId].findIndex(
          item => item.ticker === instrument.ticker
        );
        
        if (existingIndex >= 0) {
          // Update existing watchlist item
          watchlistStore[userId][existingIndex] = {
            ...watchlistStore[userId][existingIndex],
            ...instrument,
            notes: notes || watchlistStore[userId][existingIndex].notes,
            targetPrice: targetPrice || watchlistStore[userId][existingIndex].targetPrice,
            alertEnabled: !!targetPrice
          };
        } else {
          // Add new watchlist item
          const watchlistItem: WatchlistItem = {
            ...instrument,
            addedToWatchlist: new Date().toISOString(),
            notes,
            targetPrice,
            alertEnabled: !!targetPrice
          };
          
          watchlistStore[userId].push(watchlistItem);
        }
        
        return json({ 
          success: true, 
          message: 'Instrument added to watchlist',
          watchlist: watchlistStore[userId]
        });
      }
      
      if (action === 'remove') {
        const { ticker } = formData;
        
        if (!ticker) {
          return json({ error: 'Ticker is required' }, { status: 400 });
        }
        
        // Remove instrument from watchlist
        watchlistStore[userId] = watchlistStore[userId].filter(
          item => item.ticker !== ticker
        );
        
        return json({ 
          success: true, 
          message: 'Instrument removed from watchlist',
          watchlist: watchlistStore[userId]
        });
      }
      
      if (action === 'update') {
        const { ticker, updates } = formData;
        
        if (!ticker || !updates) {
          return json({ error: 'Ticker and updates are required' }, { status: 400 });
        }
        
        // Update watchlist item
        watchlistStore[userId] = watchlistStore[userId].map(item => {
          if (item.ticker === ticker) {
            return { ...item, ...updates };
          }
          return item;
        });
        
        return json({ 
          success: true, 
          message: 'Watchlist item updated',
          watchlist: watchlistStore[userId]
        });
      }
      
      return json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
      console.error('Error updating watchlist:', error);
      return json({ error: 'Failed to update watchlist' }, { status: 500 });
    }
  }
  
  return json({ error: 'Method not allowed' }, { status: 405 });
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  
  try {
    // Return user's watchlist or empty array if it doesn't exist
    const watchlist = watchlistStore[userId] || [];
    return json({ watchlist });
  } catch (error) {
    console.error('Error loading watchlist:', error);
    return json({ error: 'Failed to load watchlist' }, { status: 500 });
  }
};
