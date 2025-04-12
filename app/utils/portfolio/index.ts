import { format } from 'date-fns';
import { makeApiRequest, API_ENDPOINTS } from './api-client'; // Removed DEFAULT_HEADERS import
import { getAllInstrumentsMetadata } from './instruments';
import { getAllPiesData } from './pies';
import { calculatePerformanceMetrics } from './analysis';
import { calculateCurrentTargetInvestments } from './allocation';
import { getBenchmarkData } from './benchmarks';
import { PerformanceMetrics } from './types';

/**
 * Main function to fetch portfolio data for a specific user.
 * @param userId The ID of the user whose data is being fetched.
 * @param budget Monthly budget amount.
 * @param cc Country code.
 * @returns Portfolio performance metrics.
 */
export async function fetchPortfolioData(
  userId: string, // Add userId as the first parameter
  budget: number = 1000,
  cc: string = "BG"
): Promise<PerformanceMetrics> {
  console.log(`[fetchPortfolioData - index.ts] Starting fetch for userId: ${userId}`); // DEBUG LOG at function start
  // Initialize default performance metrics
  const defaultPerformanceMetrics: PerformanceMetrics = {
    portfolio: null,
    overallSummary: null,
    allocationAnalysis: undefined,
    rebalanceInvestmentForTarget: null,
    freeCashAvailable: 0,
    benchmarks: [],
    fetchDate: format(new Date(), "yyyy-MM-dd HH:mm:ss")
  };

  try {
    console.log(`[fetchPortfolioData - index.ts] Fetching cash for userId: ${userId}`); // <<< ADDED THIS LOG
    // Fetch cash data using the user's API key
    const cashResponse = await makeApiRequest({
      url: API_ENDPOINTS.CASH,
      userId: userId // Pass userId to makeApiRequest
    });

    if (!cashResponse) {
      console.error(`[fetchPortfolioData - index.ts] Failed to fetch cash data for user ${userId}.`); // DEBUG LOG
      // Return default but maybe log or throw a more specific error
      return defaultPerformanceMetrics;
    }

    // Calculate free cash (logic remains the same)
    let totalFreeCash = 0;
    const cashData = cashResponse.data;
    if (Array.isArray(cashData)) {
      for (const cashEntry of cashData) {
        totalFreeCash += cashEntry.cash || 0;
      }
    } else if (cashData && typeof cashData === 'object') {
      totalFreeCash = cashData.free || 0;
    }
    defaultPerformanceMetrics.freeCashAvailable = totalFreeCash;
    console.log(`[fetchPortfolioData - index.ts] Calculated free cash: ${totalFreeCash} for userId: ${userId}`); // DEBUG LOG

    // Fetch instruments metadata using the user's API key
    console.log(`[fetchPortfolioData - index.ts] Fetching instruments metadata for userId: ${userId}`); // DEBUG LOG
    const allInstrumentsMetadata = await getAllInstrumentsMetadata(userId); // Pass userId here
    if (!allInstrumentsMetadata) {
      console.error("[fetchPortfolioData - index.ts] Failed to fetch instruments metadata."); // DEBUG LOG
      return defaultPerformanceMetrics; // Or handle more gracefully
    }

    // Fetch all pies data using the user's API key
    // getAllPiesData needs to be adapted to accept and pass userId
    console.log(`[fetchPortfolioData - index.ts] Fetching pies data for userId: ${userId}`); // DEBUG LOG
    const [allPiesData, overallSummary] = await getAllPiesData(userId, allInstrumentsMetadata); // Pass userId

    // Initialize performance metrics
    const portfolioData: PerformanceMetrics = {
      ...defaultPerformanceMetrics,
      portfolio: allPiesData,
      overallSummary: overallSummary
    };

    // Update fetch date (logic remains the same)
    const dtString = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    if (allPiesData && Array.isArray(allPiesData)) {
      allPiesData.forEach(pie => { pie.fetchDate = dtString; });
    }
    if (overallSummary && overallSummary.overallSummary) {
      overallSummary.overallSummary.fetchDate = dtString;
    }

    // Calculate performance metrics and target investments (logic remains the same)
    if (portfolioData.portfolio && portfolioData.overallSummary) {
      try {
        console.log(`[fetchPortfolioData - index.ts] Calculating performance metrics for userId: ${userId}`); // DEBUG LOG
        const performanceMetrics = calculatePerformanceMetrics(portfolioData, budget);
        portfolioData.allocationAnalysis = performanceMetrics;
      } catch (error) { console.error("[fetchPortfolioData - index.ts] Error calculating performance metrics:", error); } // DEBUG LOG

      try {
        console.log(`[fetchPortfolioData - index.ts] Calculating target investments for userId: ${userId}`); // DEBUG LOG
        const targetInvestments = calculateCurrentTargetInvestments(portfolioData, budget);
        portfolioData.rebalanceInvestmentForTarget = targetInvestments;
      } catch (error) { console.error("[fetchPortfolioData - index.ts] Error calculating target investments:", error); } // DEBUG LOG

      // Fetch benchmark data (assuming this is general, not user-specific)
      try {
        console.log(`[fetchPortfolioData - index.ts] Fetching benchmark data`); // DEBUG LOG
        const benchmarks = await getBenchmarkData();
        portfolioData.benchmarks = benchmarks;
      } catch (error) { console.error("[fetchPortfolioData - index.ts] Failed to fetch benchmark data:", error); } // DEBUG LOG
    }

    console.log(`[fetchPortfolioData - index.ts] Finished fetch successfully for userId: ${userId}`); // DEBUG LOG
    return portfolioData;
  } catch (error) {
    console.error(`[fetchPortfolioData - index.ts] Error in fetchPortfolioData for user ${userId}:`, error); // DEBUG LOG
    // Consider logging the specific userId with the error
    return defaultPerformanceMetrics;
  }
}

// Re-export types and utility functions
export * from './types';
export * from './api-client';
export * from './instruments';
export * from './pies';
export * from './allocation';
export * from './analysis';
export * from './benchmarks';
