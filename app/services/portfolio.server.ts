import { UserSettings } from "~/db/schema";
import { getDb } from '~/db/database.server';
import { v4 as uuidv4 } from 'uuid';
import { fetchPortfolioData as fetchPortfolioDataFromFetcher, PerformanceMetrics } from '~/utils/portfolio_fetcher'; // Import the new fetchPortfolioData

// Use PerformanceMetrics as the return type
export async function fetchPortfolioData(settings: UserSettings, userId: string): Promise<PerformanceMetrics> {
  try {
    const portfolioData = await fetchPortfolioDataFromFetcher(settings.monthlyBudget, settings.country); // Call the new fetchPortfolioData
    console.log("Fetched: \n", JSON.stringify(portfolioData))
    if (!portfolioData) { // Handle case where fetcher returns null (error case)
      throw new Error("Failed to fetch portfolio data from portfolio_fetcher.ts");
    }

    savePortfolioData(userId, portfolioData as PerformanceMetrics); // Save data, might need to adjust type if savePortfolioData expects PortfolioData interface

    return portfolioData as PerformanceMetrics; // Return the data from portfolio_fetcher
  } catch (error) {
    console.error("Error fetching portfolio data:", error);
    throw error;
  }
}

// Function to save portfolio data for a user (now synchronous) - likely no change needed here if you handle PerformanceMetrics
export function savePortfolioData(userId: string, portfolioData: PerformanceMetrics): void {
  const db = getDb();
  const now = new Date().toISOString();
  const portfolioId = uuidv4(); // Generate a unique ID for the portfolio record

  try {
    const insertStmt = db.prepare(
      `INSERT OR REPLACE INTO user_portfolios (id, userId, portfolioData, fetchDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    insertStmt.run(
      portfolioId,
      userId,
      JSON.stringify(portfolioData), // Serialize PerformanceMetrics to JSON string
      now,
      now,
      now
    );
  } catch (error) {
    console.error("Error saving portfolio data to database:", error);
    throw error;
  }
}


// Function to get portfolio data for a user (now synchronous) - likely no change needed here, but type might need adjustment if you keep PortfolioData interface
export function getPortfolioData(userId: string): PerformanceMetrics | null { // Adjust return type to PerformanceMetrics or PortfolioData if you keep it
  const db = getDb();

  try {
    const stmt = db.prepare(
      'SELECT portfolioData FROM user_portfolios WHERE userId = ?'
    );
    const result = stmt.get(userId) as { portfolioData: string } | undefined; // Type assertion for get

    if (result && result.portfolioData) {
      return JSON.parse(result.portfolioData) as PerformanceMetrics; // Deserialize JSON string to PerformanceMetrics
    } else {
      console.error("No portfolio data found for this user.");
      return null; // No portfolio data found for this user
    }
  } catch (error) {
    console.error("Error fetching portfolio data from database:", error);
    return null; // Handle error gracefully, return null
  }
}