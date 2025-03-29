import { fetchPortfolioData as fetchPortfolioDataUtil, PerformanceMetrics } from "~/utils/portfolio_fetcher";
import { createApiError, createNetworkError, handleError, ErrorType, createError } from "~/utils/error-handler";
import { UserSettings } from "~/db/schema";
import { getDb } from '~/db/database.server';
import { v4 as uuidv4 } from 'uuid';
import { userPortfolios } from '~/db/schema';
import { eq, desc } from 'drizzle-orm';
import { addMinutes } from 'date-fns';

// Cache duration in minutes
const CACHE_DURATION = 5;

/**
 * Fetches portfolio data from the external API
 * @param budgetOrUserId - Monthly budget amount or user ID
 * @param cc - Country code (optional)
 * @returns Portfolio performance metrics or null
 */
export async function getPortfolioData(budgetOrUserId: number | string, cc?: string): Promise<PerformanceMetrics | null> {
  try {
    if (typeof budgetOrUserId === 'string') {
      return await getCachedPortfolioData(budgetOrUserId);
    }
    
    const budget = budgetOrUserId as number;
    const countryCode = cc || 'BG';
    
    const data = await fetchPortfolioDataUtil(budget, countryCode);
    
    if (!data) {
      throw createApiError("Failed to fetch portfolio data from API");
    }
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("network") || error.message.includes("connection")) {
        throw createNetworkError("Failed to connect to portfolio service");
      } else if (!('type' in error)) {
        throw createApiError("Error fetching portfolio data", { originalError: error.message });
      }
    }
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
    const cachedData = await getCachedPortfolioData(userId);

    if (cachedData) {
      const fetchDate = new Date(cachedData.fetchDate);
      const now = new Date();
      
      if (addMinutes(fetchDate, CACHE_DURATION) > now) {
        console.log("Returning cached portfolio data.");
        return cachedData;
      }
      console.log("Cached data is stale. Fetching new data.");
    }

    const portfolioData = await fetchPortfolioDataUtil(settings.monthlyBudget, settings.country);
    
    if (!portfolioData) {
      throw createError(ErrorType.API, "Failed to fetch portfolio data from external service", 500);
    }

    await savePortfolioData(userId, portfolioData);
    return portfolioData;
  } catch (error) {
    console.error("Error in fetchPortfolioData:", error);
    throw handleError(error);
  }
}

/**
 * Saves portfolio data to the database as a new historical record
 * @param userId - User ID
 * @param portfolioData - Portfolio data to save
 * @returns The ID of the newly created portfolio record
 */
export async function savePortfolioData(userId: string, portfolioData: PerformanceMetrics): Promise<string> {
  const db = getDb();
  const now = new Date().toISOString();
  const portfolioId = uuidv4();

  try {
    const fetchDate = portfolioData.fetchDate || now;

    await db.insert(userPortfolios)
      .values({
        id: portfolioId,
        userId,
        portfolioData: JSON.stringify(portfolioData), // Using text column as per schema
        fetchDate,
        createdAt: now,
        updatedAt: now
      });

    return portfolioId; // Return the ID for potential tracking
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
 * Retrieves the most recent cached portfolio data from the database
 * @param userId - User ID
 * @returns Most recent cached portfolio data or null if not found
 */
export async function getCachedPortfolioData(userId: string): Promise<PerformanceMetrics | null> {
  const db = getDb();

  try {
    const result = await db.select({
      portfolioData: userPortfolios.portfolioData,
      fetchDate: userPortfolios.fetchDate
    })
      .from(userPortfolios)
      .where(eq(userPortfolios.userId, userId))
      .orderBy(desc(userPortfolios.updatedAt))
      .limit(1);

    if (result.length === 0) {
      console.log("No cached portfolio data found for this user.");
      return null;
    }

    const { portfolioData, fetchDate } = result[0];
    try {
      const parsedData = JSON.parse(portfolioData);
      return { ...parsedData, fetchDate } as PerformanceMetrics;
    } catch (parseError) {
      console.error("Error parsing cached portfolio data:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Error fetching portfolio data from database:", error);
    return null;
  }
}

/**
 * Clears all cached portfolio data for a user
 * @param userId - User ID
 */
export async function clearCachedPortfolioData(userId: string): Promise<void> {
  const db = getDb();

  try {
    await db.delete(userPortfolios)
      .where(eq(userPortfolios.userId, userId));
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
 * Checks if portfolio data needs refreshing based on the most recent fetch
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

/**
 * Retrieves all historical portfolio data for a user
 * @param userId - User ID
 * @returns Array of all historical portfolio data entries
 */
export async function getPortfolioHistory(userId: string): Promise<PerformanceMetrics[]> {
  const db = getDb();

  try {
    const results = await db.select({
      portfolioData: userPortfolios.portfolioData,
      fetchDate: userPortfolios.fetchDate
    })
      .from(userPortfolios)
      .where(eq(userPortfolios.userId, userId))
      .orderBy(desc(userPortfolios.fetchDate)); // Order by fetchDate for chronological history

    return results.map(({ portfolioData, fetchDate }) => {
      const parsedData = JSON.parse(portfolioData);
      return { ...parsedData, fetchDate } as PerformanceMetrics;
    });
  } catch (error) {
    console.error("Error fetching portfolio history:", error);
    return [];
  }
}
