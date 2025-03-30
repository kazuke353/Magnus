import { format } from 'date-fns';
import { makeApiRequest, API_ENDPOINTS, DEFAULT_HEADERS } from './api-client';
import { getAllInstrumentsMetadata } from './instruments';
import { getAllPiesData } from './pies';
import { calculatePerformanceMetrics } from './analysis';
import { calculateCurrentTargetInvestments } from './allocation';
import { getBenchmarkData } from './benchmarks';
import { PerformanceMetrics } from './types';

/**
 * Main function to fetch portfolio data
 * @param budget Monthly budget amount
 * @param cc Country code
 * @returns Portfolio performance metrics
 */
export async function fetchPortfolioData(budget: number = 1000, cc: string = "BG"): Promise<PerformanceMetrics> {
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
    // Fetch cash data
    const cashResponse = await makeApiRequest({
      url: API_ENDPOINTS.CASH,
      headers: DEFAULT_HEADERS
    });
    
    if (!cashResponse) {
      console.error("Failed to fetch cash data.");
      return defaultPerformanceMetrics;
    }

    // Calculate free cash
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
    
    // Fetch instruments metadata
    const allInstrumentsMetadata = await getAllInstrumentsMetadata();
    if (!allInstrumentsMetadata) {
      console.error("Failed to fetch instruments metadata.");
      return defaultPerformanceMetrics;
    }
    
    // Fetch all pies data
    const [allPiesData, overallSummary] = await getAllPiesData(allInstrumentsMetadata);
    
    // Initialize performance metrics
    const portfolioData: PerformanceMetrics = {
      ...defaultPerformanceMetrics,
      portfolio: allPiesData,
      overallSummary: overallSummary
    };
    
    // Update fetch date for all pies
    const dtString = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    if (allPiesData && Array.isArray(allPiesData)) {
      allPiesData.forEach(pie => {
        pie.fetchDate = dtString;
      });
    }
    
    if (overallSummary && overallSummary.overallSummary) {
      overallSummary.overallSummary.fetchDate = dtString;
    }

    // Calculate performance metrics and target investments if we have data
    if (portfolioData.portfolio && portfolioData.overallSummary) {
      try {
        const performanceMetrics = calculatePerformanceMetrics(portfolioData, budget);
        portfolioData.allocationAnalysis = performanceMetrics;
      } catch (error) {
        console.error("Error calculating performance metrics:", error);
      }

      try {
        const targetInvestments = calculateCurrentTargetInvestments(portfolioData, budget);
        portfolioData.rebalanceInvestmentForTarget = targetInvestments;
      } catch (error) {
        console.error("Error calculating target investments:", error);
      }
      
      // Fetch benchmark data
      try {
        const benchmarks = await getBenchmarkData();
        portfolioData.benchmarks = benchmarks;
      } catch (error) {
        console.error("Failed to fetch benchmark data:", error);
      }
    }

    return portfolioData;
  } catch (error) {
    console.error("Error in fetchPortfolioData:", error);
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
