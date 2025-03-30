import { db } from '~/db/database.server';
import { portfolios, watchlists } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { PerformanceMetrics, WatchlistItem } from '~/utils/portfolio/types';
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
 * @param userSettings User settings containing budget and country code
 * @param userId User ID
 * @returns Portfolio data
 */
export async function fetchPortfolioData(userSettings: any, userId: string): Promise<PerformanceMetrics | null> {
  try {
    // Extract budget and country code from user settings
    const budget = userSettings?.monthlyBudget || 1000;
    const countryCode = userSettings?.country || 'US';
    
    // Fetch data from API
    const portfolioData = await fetchPortfolioDataFromAPI(budget, countryCode);
    
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
    
    return JSON.parse(result[0].data);
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
    const existingRecord = await db.select().from(portfolios).where(eq(portfolios.userId, userId));
    
    if (existingRecord.length === 0) {
      // Insert new record if none exists - generate a UUID for the id field
      await db.insert(portfolios).values({
        id: uuidv4(), // Generate a unique ID
        userId,
        data: JSON.stringify(data),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      // Update existing record
      await db.update(portfolios)
        .set({
          data: JSON.stringify(data),
          updatedAt: new Date()
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
    
    return JSON.parse(result[0].data);
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
    const existingRecord = await db.select().from(watchlists).where(eq(watchlists.userId, userId));
    
    if (existingRecord.length === 0) {
      // Insert new record if none exists - generate a UUID for the id field
      await db.insert(watchlists).values({
        id: uuidv4(), // Generate a unique ID
        userId,
        data: JSON.stringify(watchlist),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      // Update existing record
      await db.update(watchlists)
        .set({
          data: JSON.stringify(watchlist),
          updatedAt: new Date()
        })
        .where(eq(watchlists.userId, userId));
    }
    
    return true;
  } catch (error) {
    console.error('Error saving watchlist:', error);
    return false;
  }
}
