import axios from 'axios';
import { format, subYears, parseISO } from 'date-fns';
import yahooFinance from 'yahoo-finance2';

// Define your custom logger object
const myLogger = {
  info: (...args: any[]) => console.log('[YF2 INFO]', ...args),
  warn: (...args: any[]) => console.warn('[YF2 WARN]', ...args),
  error: (...args: any[]) => console.error('[YF2 ERROR]', ...args),
  // Implement the debug function to see debug messages
  debug: (...args: any[]) => console.log('[YF2 DEBUG]', ...args),
};

// Set the custom logger globally for yahoo-finance2
yahooFinance.setGlobalConfig({
  logger: myLogger,
});

export interface Benchmark {
  name: string;
  returnPercentage: number;
  description?: string;
  lastUpdated?: string;
}

// Default benchmarks that will be used if API fetch fails
export const DEFAULT_BENCHMARKS: Benchmark[] = [
  { 
    name: 'S&P 500', 
    returnPercentage: 9.5,
    description: 'Large-cap US stocks index',
    lastUpdated: format(new Date(), 'yyyy-MM-dd')
  },
  { 
    name: 'MSCI World', 
    returnPercentage: 7.8,
    description: 'Global developed markets index',
    lastUpdated: format(new Date(), 'yyyy-MM-dd')
  },
  { 
    name: 'FTSE 100', 
    returnPercentage: 5.2,
    description: 'UK large-cap stocks index',
    lastUpdated: format(new Date(), 'yyyy-MM-dd')
  }
];

/**
 * Fetches benchmark data using Yahoo Finance API
 * @returns Array of benchmark data
 */
export async function fetchBenchmarkData(): Promise<Benchmark[]> {
  try {
    // Define the benchmarks we want to fetch
    const benchmarksToFetch = [
      { symbol: '^GSPC', name: 'S&P 500', description: 'Large-cap US stocks index' },
      { symbol: 'URTH', name: 'MSCI World', description: 'Global developed markets index' },
      { symbol: '^FTSE', name: 'FTSE 100', description: 'UK large-cap stocks index' },
      { symbol: 'VWO', name: 'Emerging Markets', description: 'Emerging markets index' },
      { symbol: 'AGG', name: 'US Bonds', description: 'US aggregate bond index' }
    ];
    
    const today = new Date();
    const oneYearAgo = subYears(today, 1);
    
    const formattedToday = format(today, 'yyyy-MM-dd');
    
    const benchmarks: Benchmark[] = [];
    
    // Fetch data for each benchmark using chart() instead of historical()
    for (const benchmark of benchmarksToFetch) {
      try {
        // Using Yahoo Finance chart() method instead of historical()
        const result = await yahooFinance.chart(benchmark.symbol, {
          period1: oneYearAgo,
          period2: today,
          interval: '1mo' // Monthly data is sufficient for annual performance
        });
        
        if (result && result.quotes && result.quotes.length >= 2) {
          // Sort quotes by date (oldest first)
          const quotes = result.quotes.sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          // Get the oldest and newest prices
          const oldestQuote = quotes[0];
          const newestQuote = quotes[quotes.length - 1];
          
          if (oldestQuote && newestQuote && oldestQuote.close && newestQuote.close) {
            const returnPercentage = ((newestQuote.close - oldestQuote.close) / oldestQuote.close) * 100;
            
            benchmarks.push({
              name: benchmark.name,
              returnPercentage: parseFloat(returnPercentage.toFixed(2)),
              description: benchmark.description,
              lastUpdated: formattedToday
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching data for ${benchmark.name}:`, error);
      }
    }
    
    // If we couldn't fetch any benchmarks, use the defaults
    if (benchmarks.length === 0) {
      return DEFAULT_BENCHMARKS;
    }
    
    return benchmarks;
  } catch (error) {
    console.error('Error fetching benchmark data:', error);
    return DEFAULT_BENCHMARKS;
  }
}

/**
 * Simulates fetching benchmark data (for development/testing)
 * This function simulates API latency and returns realistic but slightly randomized data
 * @returns Array of benchmark data
 */
export async function simulateBenchmarkData(): Promise<Benchmark[]> {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const today = new Date();
  const formattedDate = format(today, 'yyyy-MM-dd');
  
  // Base values with slight randomization
  return [
    { 
      name: 'S&P 500', 
      returnPercentage: 9.5 + (Math.random() * 2 - 1),
      description: 'Large-cap US stocks index',
      lastUpdated: formattedDate
    },
    { 
      name: 'MSCI World', 
      returnPercentage: 7.8 + (Math.random() * 2 - 1),
      description: 'Global developed markets index',
      lastUpdated: formattedDate
    },
    { 
      name: 'FTSE 100', 
      returnPercentage: 5.2 + (Math.random() * 2 - 1),
      description: 'UK large-cap stocks index',
      lastUpdated: formattedDate
    },
    { 
      name: 'Emerging Markets', 
      returnPercentage: 4.3 + (Math.random() * 3 - 1.5),
      description: 'Emerging markets index',
      lastUpdated: formattedDate
    },
    { 
      name: 'US Bonds', 
      returnPercentage: 2.8 + (Math.random() * 1 - 0.5),
      description: 'US aggregate bond index',
      lastUpdated: formattedDate
    }
  ].map(benchmark => ({
    ...benchmark,
    returnPercentage: parseFloat(benchmark.returnPercentage.toFixed(2))
  }));
}

/**
 * Gets benchmark data, either from API or simulation based on environment
 * @param useSimulation Whether to use simulated data (default: true)
 * @returns Array of benchmark data
 */
export async function getBenchmarkData(useSimulation: boolean = true): Promise<Benchmark[]> {
  if (useSimulation) {
    return simulateBenchmarkData();
  } else {
    return fetchBenchmarkData();
  }
}
