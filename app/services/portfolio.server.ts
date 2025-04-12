import { db } from '~/db/database.server';
import { portfolios, watchlists } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { PerformanceMetrics, WatchlistItem } from '~/utils/portfolio/types';
// Correctly import the aliased function
import { fetchPortfolioData as fetchPortfolioDataFromAPI } from '~/utils/portfolio/index';
import { v4 as uuidv4 } from 'uuid';

// Cache expiration time (15 minutes)
const CACHE_EXPIRATION_MS = 15 * 60 * 1000;

/**
 * Checks if portfolio data needs to be refreshed
 * @param userId User ID
 * @returns True if data needs refresh, false otherwise
 */
export async function needsRefresh(userId: string): Promise<boolean> {
  try {
    const result = await db.select().from(portfolios).where(eq(portfolios.userId, userId));

    if (result.length === 0) {
      return true; // No data exists, needs refresh
    }

    const lastUpdated = new Date(result[0].updatedAt);
    const now = new Date();

    // Check if data is older than cache expiration time
    return now.getTime() - lastUpdated.getTime() > CACHE_EXPIRATION_MS;
  } catch (error) {
    console.error('Error checking if portfolio needs refresh:', error);
    return true; // On error, refresh to be safe
  }
}

/**
 * Fetches fresh portfolio data from API and saves to database
 * @param userId User ID // <<< Corrected parameter order
 * @param userSettings User settings containing budget and country code // <<< Corrected parameter order
 * @returns Portfolio data
 */
export async function fetchPortfolioData(
    userId: string, // <<< Corrected: userId first
    userSettings: any // <<< Corrected: userSettings second
): Promise<PerformanceMetrics | null> {
  try {
    // Extract budget and country code from user settings
    const budget = userSettings?.monthlyBudget || 1000;
    const countryCode = userSettings?.country || 'US';

    // Fetch data from API, passing userId correctly
    const portfolioData = await fetchPortfolioDataFromAPI(
        userId, // <<< Pass userId as the first argument
        budget,
        countryCode
    );

    // Save to database
    if (portfolioData) {
      await savePortfolioData(userId, portfolioData);
    }

    return portfolioData;
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    return null;
  }
}

/**
 * Gets portfolio data for a user
 * @param userId User ID
 * @returns Portfolio data or null if not found
 */
export async function getPortfolioData(userId: string): Promise<PerformanceMetrics | null> {
  try {
    const result = await db.select().from(portfolios).where(eq(portfolios.userId, userId));

    if (result.length === 0) {
      return null;
    }

    // Ensure data is parsed correctly
    const data = result[0].data;
    if (typeof data === 'string') {
        return JSON.parse(data);
    } else if (typeof data === 'object' && data !== null) {
        // If it's already an object (less likely with current setup but possible)
        return data as PerformanceMetrics;
    }
    return null; // Return null if data is not a string or object

  } catch (error) {
    console.error('Error getting portfolio data:', error);
    return null;
  }
}

/**
 * Saves portfolio data for a user
 * @param userId User ID
 * @param data Portfolio data to save
 * @returns True if successful, false otherwise
 */
export async function savePortfolioData(userId: string, data: PerformanceMetrics): Promise<boolean> {
  try {
    // First check if a record exists for this user
    const existingRecord = await db.select({ id: portfolios.id }) // Select only id for efficiency
        .from(portfolios)
        .where(eq(portfolios.userId, userId))
        .limit(1);

    const now = new Date(); // Use Date object for Drizzle timestamp

    if (existingRecord.length === 0) {
      // Insert new record if none exists - generate a UUID for the id field
      await db.insert(portfolios).values({
        id: uuidv4(), // Generate a unique ID
        userId,
        data: JSON.stringify(data),
        createdAt: now,
        updatedAt: now
      });
    } else {
      // Update existing record
      await db.update(portfolios)
        .set({
          data: JSON.stringify(data),
          updatedAt: now
        })
        .where(eq(portfolios.userId, userId));
    }

    return true;
  } catch (error) {
    console.error('Error saving portfolio data:', error);
    return false;
  }
}

/**
 * Gets watchlist for a user
 * @param userId User ID
 * @returns Watchlist items or empty array if not found
 */
export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  try {
    const result = await db.select().from(watchlists).where(eq(watchlists.userId, userId));

    if (result.length === 0) {
      return [];
    }

    // Ensure data is parsed correctly
    const data = result[0].data;
     if (typeof data === 'string') {
        return JSON.parse(data);
    } else if (Array.isArray(data)) {
        // If it's already an array (less likely but possible)
        return data as WatchlistItem[];
    }
    return []; // Return empty array if data is not a string or array

  } catch (error) {
    console.error('Error getting watchlist:', error);
    return [];
  }
}

/**
 * Saves watchlist for a user
 * @param userId User ID
 * @param watchlist Watchlist items to save
 * @returns True if successful, false otherwise
 */
export async function saveWatchlist(userId: string, watchlist: WatchlistItem[]): Promise<boolean> {
  try {
    // First check if a record exists for this user
    const existingRecord = await db.select({ id: watchlists.id }) // Select only id
        .from(watchlists)
        .where(eq(watchlists.userId, userId))
        .limit(1);

    const now = new Date(); // Use Date object

    if (existingRecord.length === 0) {
      // Insert new record if none exists - generate a UUID for the id field
      await db.insert(watchlists).values({
        id: uuidv4(), // Generate a unique ID
        userId,
        data: JSON.stringify(watchlist),
        createdAt: now,
        updatedAt: now
      });
    } else {
      // Update existing record
      await db.update(watchlists)
        .set({
          data: JSON.stringify(watchlist),
          updatedAt: now
        })
        .where(eq(watchlists.userId, userId));
    }

    return true;
  } catch (error) {
    console.error('Error saving watchlist:', error);
    return false;
  }
}

/**
 * Gets portfolio allocations for a user
 * @param userId User ID
 * @returns Allocation data or null if not found
 */
export async function getPortfolioAllocations(userId: string): Promise<any | null> { // Adjust 'any' to your specific allocation type if defined
  try {
    const result = await db.select().from(portfolioAllocations).where(eq(portfolioAllocations.userId, userId));

    if (result.length === 0) {
      return null;
    }

    // Ensure data is parsed correctly
    const data = result[0].data;
    if (typeof data === 'string') {
        return JSON.parse(data);
    } else if (typeof data === 'object' && data !== null) {
        return data;
    }
    return null;

  } catch (error) {
    console.error('Error getting portfolio allocations:', error);
    return null;
  }
}

/**
 * Saves portfolio allocations for a user
 * @param userId User ID
 * @param data Allocation data to save
 * @returns True if successful, false otherwise
 */
export async function savePortfolioAllocations(userId: string, data: any): Promise<boolean> { // Adjust 'any'
  try {
    const existingRecord = await db.select({ id: portfolioAllocations.id })
        .from(portfolioAllocations)
        .where(eq(portfolioAllocations.userId, userId))
        .limit(1);

    const now = new Date();

    if (existingRecord.length === 0) {
      await db.insert(portfolioAllocations).values({
        id: uuidv4(),
        userId,
        data: JSON.stringify(data),
        createdAt: now,
        updatedAt: now
      });
    } else {
      await db.update(portfolioAllocations)
        .set({
          data: JSON.stringify(data),
          updatedAt: now
        })
        .where(eq(portfolioAllocations.userId, userId));
    }

    return true;
  } catch (error) {
    console.error('Error saving portfolio allocations:', error);
    return false;
  }
}
