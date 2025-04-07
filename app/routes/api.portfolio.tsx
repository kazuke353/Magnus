import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { getPortfolioData, fetchPortfolioData, needsRefresh } from "~/services/portfolio.server";
import { getBenchmarkData } from "~/utils/portfolio/benchmarks";
import { createApiError, handleError } from "~/utils/error-handler";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Authenticate the user
    const user = await requireAuthentication(request);
    
    // Check if we need to force refresh the data
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";
    
    // Get portfolio data
    let portfolioData;
    
    if (forceRefresh || await needsRefresh(user.id)) {
      // Fetch fresh data
      portfolioData = await fetchPortfolioData(user.settings, user.id);
    } else {
      // Use cached data
      portfolioData = await getPortfolioData(user.id);
    }
    
    if (!portfolioData) {
      throw createApiError("Failed to retrieve portfolio data", 500);
    }
    
    // Mock historical values (in a real app, these would come from the database)
    const historicalValues = generateMockHistoricalValues();
    
    // Get benchmark data if not already included in portfolio data
    let benchmarks = portfolioData.benchmarks || [];
    if (benchmarks.length === 0) {
      try {
        benchmarks = await getBenchmarkData(true); // Use simulated data
      } catch (error) {
        console.error("Error fetching benchmark data:", error);
        // Continue without benchmarks if there's an error
      }
    }
    
    return json({
      portfolioData,
      historicalValues,
      benchmarks
    });
  } catch (error) {
    console.error("API Portfolio Error:", error);
    
    if (error instanceof Response) {
      throw error;
    }
    
    const apiError = handleError(error);
    return json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
};

// Helper function to generate mock historical values
function generateMockHistoricalValues() {
  const values = [];
  const now = new Date();
  let currentValue = 10000; // Starting value
  
  for (let i = 365; i >= 0; i -= 7) { // Weekly data points for a year
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Add some randomness to simulate market fluctuations
    const randomChange = (Math.random() - 0.45) * 0.05; // -2.5% to +2.5%
    currentValue = currentValue * (1 + randomChange);
    
    values.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(currentValue * 100) / 100
    });
  }
  
  return values;
}
