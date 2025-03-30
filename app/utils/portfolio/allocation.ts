import { PieData, PieAllocation } from './types';

/**
 * Calculates the current allocation of each pie in the portfolio
 * @param pies Array of pie data
 * @returns Object with current allocations by pie name
 */
export function calculateCurrentAllocations(pies: PieData[]): Record<string, number> {
  if (!pies || pies.length === 0) {
    return {};
  }

  // Calculate total portfolio value
  const totalPortfolioValue = pies.reduce((sum, pie) => {
    const pieValue = pie.instruments.reduce((pieSum, instrument) => 
      pieSum + instrument.currentValue, 0);
    return sum + pieValue;
  }, 0);

  if (totalPortfolioValue === 0) {
    return {};
  }

  // Calculate allocation percentage for each pie
  const allocations: Record<string, number> = {};
  pies.forEach(pie => {
    const pieValue = pie.instruments.reduce((sum, instrument) => 
      sum + instrument.currentValue, 0);
    allocations[pie.name] = (pieValue / totalPortfolioValue) * 100;
  });

  return allocations;
}

/**
 * Gets target allocations for all pies
 * @param pies Array of pie data
 * @returns Object with target allocations by pie name
 */
export function getTargetAllocations(pies: PieData[]): Record<string, number> {
  if (!pies || pies.length === 0) {
    return {};
  }

  const allocations: Record<string, number> = {};
  
  pies.forEach(pie => {
    // Check if pie has explicit target allocation
    if (pie.targetAllocation !== undefined) {
      allocations[pie.name] = pie.targetAllocation;
    } else {
      // Try to extract from name (e.g., "My Pie (25%)")
      const percentMatch = pie.name.match(/\((\d+(?:\.\d+)?)%\)/);
      if (percentMatch && percentMatch[1]) {
        allocations[pie.name] = parseFloat(percentMatch[1]);
      } else {
        // Default to equal allocation
        allocations[pie.name] = 100 / pies.length;
      }
    }
  });

  return allocations;
}

/**
 * Calculates the difference between current and target allocations
 * @param currentAllocations Current allocation percentages
 * @param targetAllocations Target allocation percentages
 * @returns Object with allocation differences by pie name
 */
export function calculateAllocationDifferences(
  currentAllocations: Record<string, number>,
  targetAllocations: Record<string, number>
): Record<string, number> {
  const differences: Record<string, number> = {};
  
  // Get all unique pie names
  const pieNames = new Set([
    ...Object.keys(currentAllocations),
    ...Object.keys(targetAllocations)
  ]);
  
  pieNames.forEach(pieName => {
    const current = currentAllocations[pieName] || 0;
    const target = targetAllocations[pieName] || 0;
    differences[pieName] = current - target;
  });
  
  return differences;
}

/**
 * Determines if portfolio rebalancing is recommended
 * @param allocationDifferences Differences between current and target allocations
 * @param threshold Threshold percentage difference to trigger rebalancing
 * @returns Boolean indicating if rebalancing is recommended
 */
export function isRebalancingRecommended(
  allocationDifferences: Record<string, number>,
  threshold: number = 5
): boolean {
  return Object.values(allocationDifferences).some(diff => 
    Math.abs(diff) > threshold
  );
}

/**
 * Updates the target allocation for a specific pie
 * @param pies Array of pie data
 * @param pieName Name of the pie to update
 * @param targetAllocation New target allocation percentage
 * @returns Updated array of pie data
 */
export function updatePieTargetAllocation(
  pies: PieData[],
  pieName: string,
  targetAllocation: number
): PieData[] {
  return pies.map(pie => {
    if (pie.name === pieName) {
      return {
        ...pie,
        targetAllocation
      };
    }
    return pie;
  });
}

/**
 * Saves pie allocations to storage
 * @param allocations Array of pie allocations
 * @param isServer Whether this is running on the server
 */
export function savePieAllocations(allocations: PieAllocation[], isServer: boolean = false): void {
  if (isServer) {
    // Server-side storage would be implemented here (e.g., database)
    return;
  }
  
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pieAllocations', JSON.stringify(allocations));
    }
  } catch (error) {
    console.error('Error saving pie allocations to storage:', error);
  }
}

/**
 * Loads pie allocations from storage
 * @param isServer Whether this is running on the server
 * @returns Array of pie allocations or empty array if none found
 */
export function loadPieAllocations(isServer: boolean = false): PieAllocation[] {
  if (isServer) {
    // Server-side storage would be implemented here (e.g., database)
    return [];
  }
  
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('pieAllocations');
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Error loading pie allocations from storage:', error);
  }
  return [];
}

/**
 * Applies saved allocations to pie data
 * @param pies Array of pie data
 * @param allocations Array of pie allocations
 * @returns Updated array of pie data with allocations applied
 */
export function applyPieAllocations(
  pies: PieData[],
  allocations: PieAllocation[]
): PieData[] {
  if (!allocations || allocations.length === 0) {
    return pies;
  }
  
  const allocationMap = allocations.reduce((map, allocation) => {
    map[allocation.pieName] = allocation.targetAllocation;
    return map;
  }, {} as Record<string, number>);
  
  return pies.map(pie => {
    if (allocationMap[pie.name] !== undefined) {
      return {
        ...pie,
        targetAllocation: allocationMap[pie.name]
      };
    }
    return pie;
  });
}

/**
 * Calculates current allocation with target percentages
 * @param pies Array of pie data
 * @returns Tuple with current allocation values and target percentages
 */
export function calculateCurrentAllocation(
  pies: PieData[]
): [Record<string, number>, Record<string, number>] {
  // Calculate current allocation values
  const currentAllocation: Record<string, number> = {};
  let totalValue = 0;
  
  pies.forEach(pie => {
    const pieValue = pie.instruments.reduce((sum, instrument) => 
      sum + instrument.currentValue, 0);
    currentAllocation[pie.name] = pieValue;
    totalValue += pieValue;
  });
  
  // Calculate target percentages
  const targetPercentages = getTargetAllocations(pies);
  
  return [currentAllocation, targetPercentages];
}

/**
 * Calculates percentage allocation from absolute values
 * @param currentAllocation Current allocation values
 * @returns Percentage allocation
 */
export function calculatePercentAllocation(
  currentAllocation: Record<string, number>
): Record<string, number> {
  const percentAllocation: Record<string, number> = {};
  const totalValue = Object.values(currentAllocation).reduce((sum, value) => sum + value, 0);
  
  if (totalValue === 0) {
    return percentAllocation;
  }
  
  Object.entries(currentAllocation).forEach(([key, value]) => {
    percentAllocation[key] = (value / totalValue) * 100;
  });
  
  return percentAllocation;
}

/**
 * Formats allocation for display
 * @param allocation Allocation values
 * @param percentAllocation Percentage allocation
 * @param isTarget Whether this is a target allocation
 * @returns Formatted allocation
 */
export function formatAllocation(
  allocation: Record<string, number>,
  percentAllocation?: Record<string, number>,
  isTarget: boolean = false
): Record<string, { value: number; percent: number }> {
  const formattedAllocation: Record<string, { value: number; percent: number }> = {};
  
  Object.entries(allocation).forEach(([key, value]) => {
    const percent = isTarget ? value : (percentAllocation ? percentAllocation[key] : 0);
    formattedAllocation[key] = {
      value,
      percent
    };
  });
  
  return formattedAllocation;
}

/**
 * Calculates current and target investments for rebalancing
 * @param portfolioData Portfolio data
 * @param budget Monthly budget
 * @returns Rebalancing investments
 */
export function calculateCurrentTargetInvestments(
  portfolioData: any,
  budget: number
): Record<string, { current: number; target: number; difference: number }> {
  if (!portfolioData.portfolio || !Array.isArray(portfolioData.portfolio)) {
    return {};
  }
  
  const pies = portfolioData.portfolio;
  const [currentAllocation, targetPercentages] = calculateCurrentAllocation(pies);
  const percentAllocation = calculatePercentAllocation(currentAllocation);
  
  const totalValue = Object.values(currentAllocation).reduce((sum, value) => sum + value, 0);
  const investments: Record<string, { current: number; target: number; difference: number }> = {};
  
  Object.keys(currentAllocation).forEach(pieName => {
    const currentValue = currentAllocation[pieName] || 0;
    const targetPercent = targetPercentages[pieName] || 0;
    const targetValue = (totalValue * targetPercent) / 100;
    
    investments[pieName] = {
      current: currentValue,
      target: targetValue,
      difference: targetValue - currentValue
    };
  });
  
  return investments;
}
