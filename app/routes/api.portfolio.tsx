import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { getPortfolioData, fetchPortfolioData, needsRefresh } from "~/services/portfolio.server";
import { getBenchmarkData } from "~/utils/portfolio/benchmarks";
import { createApiError, handleError } from "~/utils/error-handler";
import { apiLimiter } from "~/utils/rate-limiter.server"; // Import rate limiter

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Apply rate limiting first
  const { allowed, remaining } = apiLimiter(request);
  if (!allowed) {
    return json({ error: "Too many requests, please try again later." }, { status: 429 });
  }

  try {
    // Authenticate the user
    const user = await requireAuthentication(request);
    console.log(`[API Portfolio Loader] Authenticated User ID: ${user.id}`); // DEBUG LOG

    // Check if we need to force refresh the data
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    // Get portfolio data
    let portfolioData;

    if (forceRefresh || await needsRefresh(user.id)) {
      console.log(`[API Portfolio Loader] Fetching fresh data for User ID: ${user.id}`); // DEBUG LOG
      // Fetch fresh data, passing the correct user ID and settings
      portfolioData = await fetchPortfolioData(user.id, user.settings); // Pass user.id first, then settings
    } else {
      console.log(`[API Portfolio Loader] Using cached data for User ID: ${user.id}`); // DEBUG LOG
      // Use cached data
      portfolioData = await getPortfolioData(user.id);
    }

    if (!portfolioData) {
      // Log specific error if fetchPortfolioData returned null
      console.error(`[API Portfolio Loader] Failed to retrieve or fetch portfolio data for User ID: ${user.id}`); // DEBUG LOG
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

    // Data Exposure Review: Select only necessary fields before returning
    // --- UPDATED FILTERING ---
    const filteredPortfolioData = {
      overallSummary: portfolioData.overallSummary ? {
        overallSummary: {
          totalInvestedOverall: portfolioData.overallSummary.overallSummary.totalInvestedOverall,
          totalResultOverall: portfolioData.overallSummary.overallSummary.totalResultOverall,
          returnPercentageOverall: portfolioData.overallSummary.overallSummary.returnPercentageOverall,
          fetchDate: portfolioData.overallSummary.overallSummary.fetchDate,
        }
      } : null,
      allocationAnalysis: portfolioData.allocationAnalysis ? {
        targetAllocation: portfolioData.allocationAnalysis.targetAllocation,
        currentAllocation: portfolioData.allocationAnalysis.currentAllocation,
        allocationDifferences: portfolioData.allocationAnalysis.allocationDifferences,
        estimatedAnnualDividend: portfolioData.allocationAnalysis.estimatedAnnualDividend,
      } : undefined,
      portfolio: portfolioData.portfolio ? portfolioData.portfolio.map(pie => ({
        name: pie.name,
        creationDate: pie.creationDate, // Include creationDate
        dividendCashAction: pie.dividendCashAction, // Include dividendCashAction
        returnPercentage: pie.returnPercentage,
        totalInvested: pie.totalInvested,
        totalResult: pie.totalResult,
        instruments: pie.instruments.map(inst => ({
          ticker: inst.ticker,
          fullName: inst.fullName,
          type: inst.type, // Include type
          ownedQuantity: inst.ownedQuantity,
          investedValue: inst.investedValue,
          currentValue: inst.currentValue,
          resultValue: inst.resultValue,
          dividendYield: inst.dividendYield, // Include dividendYield
          performance_1day: inst.performance_1day, // Include performance_1day
          performance_1week: inst.performance_1week, // Include performance_1week
          performance_1month: inst.performance_1month, // Include performance_1month
          performance_3months: inst.performance_3months, // Include performance_3months
          performance_1year: inst.performance_1year, // Include performance_1year
          pieCurrentAllocation: inst.pieCurrentAllocation, // Include renamed pieCurrentAllocation
          pieTargetAllocation: inst.pieTargetAllocation, // Include renamed pieTargetAllocation
          // Add other fields ONLY if needed by the client for this specific API
        }))
      })) : null,
      freeCashAvailable: portfolioData.freeCashAvailable,
      fetchDate: portfolioData.fetchDate,
      // Explicitly exclude rebalanceInvestmentForTarget unless needed
    };
    // --- END UPDATED FILTERING ---


    return json({
      portfolioData: filteredPortfolioData, // Return filtered data
      historicalValues, // Assuming these are safe
      benchmarks // Assuming these are safe
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
