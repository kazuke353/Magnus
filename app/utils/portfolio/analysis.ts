import { format } from 'date-fns';
import { 
  PieData, 
  OverallSummary, 
  PerformanceMetrics, 
  AllocationAnalysis 
} from './types';
import {
  calculateCurrentAllocation,
  calculatePercentAllocation,
  formatAllocation,
  calculateAllocationDifferences
} from './allocation';

/**
 * Validates portfolio data structure
 * @param portfolioData Portfolio data to validate
 * @returns Whether the data is valid
 */
export function validatePortfolioData(portfolioData: any): boolean {
  if (typeof portfolioData !== 'object' || 
      portfolioData === null || 
      !('portfolio' in portfolioData)) {
    console.error("Invalid portfolio data format.");
    return false;
  }
  return true;
}

/**
 * Extracts overall summary from portfolio data
 * @param portfolioData Portfolio performance metrics
 * @returns Overall summary or null if not found
 */
export function extractOverallSummary(portfolioData: PerformanceMetrics): OverallSummary | null {
  if (!portfolioData.overallSummary) {
    console.error("No overall summary found");
    return null;
  }
  return portfolioData.overallSummary;
}

/**
 * Extracts pies from portfolio data (excluding overallSummary)
 * @param portfolio Array of pie data
 * @returns Filtered array of pies
 */
export function extractPies(portfolio: PieData[] | null | undefined): PieData[] {
  if (!portfolio || !Array.isArray(portfolio)) {
    return [];
  }
  return portfolio.filter(pie => pie.name !== "OverallSummary");
}

/**
 * Calculates basic performance metrics from overall summary
 * @param overallSummary Overall portfolio summary
 * @returns Record of basic performance metrics
 */
export function calculateBasicPerformanceMetrics(overallSummary: OverallSummary): Record<string, number> {
  const os = overallSummary.overallSummary;
  return {
    totalInvested: os.totalInvestedOverall,
    totalResult: os.totalResultOverall,
    returnPercentage: os.returnPercentageOverall,
  };
}

/**
 * Calculates estimated annual dividend with budget impact
 * @param portfolioData Portfolio performance metrics
 * @param budget Monthly budget amount
 * @returns Estimated annual dividend
 */
export function calculateEstimatedAnnualDividend(portfolioData: PerformanceMetrics, budget: number): number {
  let totalAnnualDividend = 0;
  const annualBudget = budget * 12;

  if (!portfolioData.portfolio || !Array.isArray(portfolioData.portfolio)) {
    return 0;
  }

  // Calculate total portfolio value
  let totalPortfolioValue = 0;
  for (const pie of portfolioData.portfolio) {
    if (pie.instruments && Array.isArray(pie.instruments)) {
      for (const instrument of pie.instruments) {
        totalPortfolioValue += instrument.currentValue || 0;
      }
    }
  }

  // Calculate dividend yield
  for (const pie of portfolioData.portfolio) {
    if (pie.instruments && Array.isArray(pie.instruments)) {
      for (const instrument of pie.instruments) {
        const dividendYield = instrument.dividendYield || 0;
        const currentValue = instrument.currentValue || 0;
        
        // Current dividend
        const annualDividendInstrument = (currentValue * dividendYield) / 100;
        totalAnnualDividend += annualDividendInstrument;

        // Future dividend from budget allocation
        const allocationRatio = totalPortfolioValue > 0 ? 
          currentValue / totalPortfolioValue : 0;
        const budgetAllocation = annualBudget * allocationRatio;
        const annualDividendFromBudget = (budgetAllocation * dividendYield) / 100;
        totalAnnualDividend += annualDividendFromBudget;
      }
    }
  }

  return totalAnnualDividend;
}

/**
 * Calculates portfolio performance metrics and allocation analysis
 * @param portfolioData Portfolio performance metrics
 * @param budget Monthly budget amount
 * @returns Allocation analysis or null if validation fails
 */
export function calculatePerformanceMetrics(portfolioData: PerformanceMetrics, budget: number): AllocationAnalysis | null {
  try {
    if (!validatePortfolioData(portfolioData)) {
      console.error("Portfolio data validation failed");
      return null;
    }
    
    const overallSummary = extractOverallSummary(portfolioData);
    if (!overallSummary) {
      console.error("Failed to extract overall summary");
      return null;
    }
    
    const pies = extractPies(portfolioData.portfolio);
    if (pies.length === 0) {
      console.error("No pies found in portfolio data");
      return null;
    }
    
    // Safely calculate allocations with proper error handling
    let currentAllocation = {};
    let targetAllocationPercentages = {};
    
    try {
      const result = calculateCurrentAllocation(pies);
      // Explicitly assign the result elements to avoid destructuring issues
      currentAllocation = result[0];
      targetAllocationPercentages = result[1];
    } catch (error) {
      console.error("Error calculating current allocation:", error);
    }
    
    // Safely calculate percent allocation
    let percentAllocation = {};
    try {
      percentAllocation = calculatePercentAllocation(currentAllocation);
    } catch (error) {
      console.error("Error calculating percent allocation:", error);
    }

    // Format allocations with proper error handling
    let formattedCurrentAllocation = {};
    let formattedTargetAllocation = {};
    let formattedAllocationDifferences = {};
    
    try {
      formattedCurrentAllocation = formatAllocation(currentAllocation, percentAllocation);
      formattedTargetAllocation = formatAllocation(targetAllocationPercentages, undefined, true);
      formattedAllocationDifferences = calculateAllocationDifferences(
        percentAllocation as Record<string, number>, 
        targetAllocationPercentages as Record<string, number>
      );
    } catch (error) {
      console.error("Error formatting allocations:", error);
    }
    
    // Calculate estimated annual dividend
    let estimatedAnnualDividend = 0;
    try {
      estimatedAnnualDividend = calculateEstimatedAnnualDividend(portfolioData, budget);
    } catch (error) {
      console.error("Error calculating estimated annual dividend:", error);
    }

    return {
      targetAllocation: formattedTargetAllocation,
      currentAllocation: formattedCurrentAllocation,
      allocationDifferences: formattedAllocationDifferences,
      estimatedAnnualDividend: estimatedAnnualDividend
    };
  } catch (error) {
    console.error("Error in calculatePerformanceMetrics:", error);
    return null;
  }
}
