import { WatchlistItem } from './types';

/**
 * Sorts watchlist items by a specific field
 * @param watchlist Array of watchlist items
 * @param sortBy Field to sort by
 * @param ascending Whether to sort in ascending order
 * @returns Sorted array of watchlist items
 */
export function sortWatchlist(
  watchlist: WatchlistItem[],
  sortBy: keyof WatchlistItem = 'name',
  ascending: boolean = true
): WatchlistItem[] {
  return [...watchlist].sort((a, b) => {
    let valueA = a[sortBy];
    let valueB = b[sortBy];
    
    // Handle undefined values
    if (valueA === undefined) return ascending ? -1 : 1;
    if (valueB === undefined) return ascending ? 1 : -1;
    
    // Handle different types
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return ascending 
        ? valueA.localeCompare(valueB) 
        : valueB.localeCompare(valueA);
    }
    
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return ascending 
        ? valueA - valueB 
        : valueB - valueA;
    }
    
    if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
      return ascending 
        ? (valueA ? 1 : -1) 
        : (valueB ? 1 : -1);
    }
    
    // Handle dates
    if (valueA instanceof Date && valueB instanceof Date) {
      return ascending 
        ? valueA.getTime() - valueB.getTime() 
        : valueB.getTime() - valueA.getTime();
    }
    
    // Convert dates from strings
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      const dateA = new Date(valueA);
      const dateB = new Date(valueB);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return ascending 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      }
    }
    
    // Default comparison
    return ascending 
      ? String(valueA).localeCompare(String(valueB)) 
      : String(valueB).localeCompare(String(valueA));
  });
}

/**
 * Filters watchlist items by search term
 * @param watchlist Array of watchlist items
 * @param searchTerm Search term to filter by
 * @returns Filtered array of watchlist items
 */
export function filterWatchlist(
  watchlist: WatchlistItem[],
  searchTerm: string = ''
): WatchlistItem[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return watchlist;
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  return watchlist.filter(item => {
    return (
      (item.ticker && item.ticker.toLowerCase().includes(term)) ||
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.exchange && item.exchange.toLowerCase().includes(term)) ||
      (item.sector && item.sector.toLowerCase().includes(term)) ||
      (item.industry && item.industry.toLowerCase().includes(term)) ||
      (item.notes && item.notes.toLowerCase().includes(term))
    );
  });
}

/**
 * Saves watchlist to storage
 * @param watchlist Array of watchlist items
 * @param isServer Whether this is running on the server
 */
export function saveWatchlist(watchlist: WatchlistItem[], isServer: boolean = false): void {
  if (isServer) {
    // Server-side storage would be implemented here (e.g., database)
    return;
  }
  
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
    }
  } catch (error) {
    console.error('Error saving watchlist to storage:', error);
  }
}

/**
 * Loads watchlist from storage
 * @param isServer Whether this is running on the server
 * @returns Array of watchlist items or empty array if none found
 */
export function loadWatchlist(isServer: boolean = false): WatchlistItem[] {
  if (isServer) {
    // Server-side storage would be implemented here (e.g., database)
    return [];
  }
  
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('watchlist');
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error loading watchlist from storage:', error);
  }
  return [];
}

/**
 * Adds an item to the watchlist
 * @param watchlist Current watchlist
 * @param item Item to add
 * @returns Updated watchlist
 */
export function addToWatchlist(watchlist: WatchlistItem[], item: WatchlistItem): WatchlistItem[] {
  // Check if item already exists
  const existingIndex = watchlist.findIndex(existing => existing.ticker === item.ticker);
  
  if (existingIndex >= 0) {
    // Update existing item
    return watchlist.map((existing, index) => 
      index === existingIndex ? { ...existing, ...item } : existing
    );
  }
  
  // Add new item
  return [...watchlist, item];
}

/**
 * Removes an item from the watchlist
 * @param watchlist Current watchlist
 * @param ticker Ticker of item to remove
 * @returns Updated watchlist
 */
export function removeFromWatchlist(watchlist: WatchlistItem[], ticker: string): WatchlistItem[] {
  return watchlist.filter(item => item.ticker !== ticker);
}

/**
 * Updates an item in the watchlist
 * @param watchlist Current watchlist
 * @param ticker Ticker of item to update
 * @param updates Updates to apply
 * @returns Updated watchlist
 */
export function updateWatchlistItem(
  watchlist: WatchlistItem[],
  ticker: string,
  updates: Partial<WatchlistItem>
): WatchlistItem[] {
  return watchlist.map(item => {
    if (item.ticker === ticker) {
      return { ...item, ...updates };
    }
    return item;
  });
}
