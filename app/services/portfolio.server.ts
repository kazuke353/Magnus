import { fetchPortfolioData as fetchPortfolioDataUtil } from "~/utils/portfolio_fetcher";
import { createApiError, createNetworkError, handleError, ErrorType, createError } from "~/utils/error-handler";
import { UserSettings } from "~/db/schema";
import { getDb } from '~/db/database.server';
import { v4 as uuidv4 } from 'uuid';
import { PerformanceMetrics } from '~/utils/portfolio_fetcher';
import { format, addMinutes } from 'date-fns';

// Cache duration in minutes
const CACHE_DURATION = 5;

/**
 * Fetches portfolio data from the external API
 * @param budget - Monthly budget amount
 * @param cc - Country code
 * @returns Portfolio performance metrics
 */
export async function getPortfolioData(budgetOrUserId: number | string, cc?: string): Promise<PerformanceMetrics | null> {
  try {
    // If the first parameter is a string, assume it's a userId and try to get cached data
    if (typeof budgetOrUserId === 'string') {
      return await getCachedPortfolioData(budgetOrUserId);
    }
    
    // Otherwise, fetch fresh data using the budget and country code
    const budget = budgetOrUserId as number;
    const countryCode = cc || 'BG';
    
    const data = await fetchPortfolioDataUtil(budget, countryCode);
    
    if (!data) {
      throw createApiError("Failed to fetch portfolio data from API");
    }
    
    return data;
  } catch (error) {
    // Determine if it's a network error or API error
    if (error instanceof Error) {
      if (error.message.includes("network") || error.message.includes("connection")) {
        throw createNetworkError("Failed to connect to portfolio service");
      } else if (!('type' in error)) { // Only wrap if not already an AppError
        throw createApiError("Error fetching portfolio data", { originalError: error.message });
      }
    }
    
    // Re-throw the error for the global error handler
    throw handleError(error);
  }
}

/**
 * Fetches portfolio data with caching logic
 * @param settings - User settings containing budget and country
 * @param userId - User ID for caching
 * @returns Portfolio performance metrics
 */
export async function fetchPortfolioData(settings: UserSettings, userId: string): Promise<PerformanceMetrics> {
  try {
    // Try to get cached data first
    const cachedData = await getCachedPortfolioData(userId);

    // Check if cached data exists and is still valid
    if (cachedData) {
      const fetchDate = new Date(cachedData.fetchDate);
      const now = new Date();
      
      if (addMinutes(fetchDate, CACHE_DURATION) > now) {
        console.log("Returning cached portfolio data.");
        return cachedData;
      } else {
        console.log("Cached data is stale. Fetching new data.");
      }
    }

    // Fetch fresh data if no valid cache exists
    const portfolioData = await fetchPortfolioDataUtil(settings.monthlyBudget, settings.country);
    
    if (!portfolioData) {
      throw createError(
        ErrorType.API,
        "Failed to fetch portfolio data from external service",
        500
      );
    }

    // Save the fresh data to cache
    await savePortfolioData(userId, portfolioData);

    return portfolioData;
  } catch (error) {
    console.error("Error in fetchPortfolioData:", error);
    throw handleError(error);
  }
}

/**
 * Saves portfolio data to the database
 * @param userId - User ID
 * @param portfolioData - Portfolio data to save
 */
export async function savePortfolioData(userId: string, portfolioData: PerformanceMetrics): Promise<void> {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const portfolioId = uuidv4();

    // Ensure fetchDate is set
    if (!portfolioData.fetchDate) {
      portfolioData.fetchDate = now;
    }

    const insertStmt = db.prepare(
      `INSERT OR REPLACE INTO user_portfolios (id, userId, portfolioData, fetchDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    
    insertStmt.run(
      portfolioId,
      userId,
      JSON.stringify(portfolioData),
      portfolioData.fetchDate,
      now,
      now
    );
  } catch (error) {
    console.error("Error saving portfolio data to database:", error);
    throw createError(
      ErrorType.DATABASE,
      "Failed to save portfolio data to database",
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Retrieves cached portfolio data from the database
 * @param userId - User ID
 * @returns Cached portfolio data or null if not found
 */
export async function getCachedPortfolioData(userId: string): Promise<PerformanceMetrics | null> {
  try {
    const db = getDb();

    const stmt = db.prepare(
      'SELECT portfolioData, fetchDate FROM user_portfolios WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1'
    );
    
    const result = stmt.get(userId) as { portfolioData: string; fetchDate: string } | undefined;

    if (result && result.portfolioData) {
      try {
        const parsedData = JSON.parse(result.portfolioData);
        return { ...parsedData, fetchDate: result.fetchDate } as PerformanceMetrics;
      } catch (parseError) {
        console.error("Error parsing cached portfolio data:", parseError);
        return null;
      }
    } else {
      console.log("No cached portfolio data found for this user.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching portfolio data from database:", error);
    // Return null instead of throwing to allow fallback to fresh data fetch
    return null;
  }
}

/**
 * Clears cached portfolio data for a user
 * @param userId - User ID
 */
export async function clearCachedPortfolioData(userId: string): Promise<void> {
  try {
    const db = getDb();
    
    const deleteStmt = db.prepare(
      'DELETE FROM user_portfolios WHERE userId = ?'
    );
    
    deleteStmt.run(userId);
  } catch (error) {
    console.error("Error clearing cached portfolio data:", error);
    throw createError(
      ErrorType.DATABASE,
      "Failed to clear cached portfolio data",
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Checks if portfolio data needs refreshing
 * @param userId - User ID
 * @returns True if data needs refreshing, false otherwise
 */
export async function needsRefresh(userId: string): Promise<boolean> {
  const cachedData = await getCachedPortfolioData(userId);
  
  if (!cachedData || !cachedData.fetchDate) {
    return true;
  }
  
  const fetchDate = new Date(cachedData.fetchDate);
  const now = new Date();
  
  return addMinutes(fetchDate, CACHE_DURATION) < now;
}
