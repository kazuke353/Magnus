export interface InstrumentMetadata {
  ticker: string;
  name: string;
  currencyCode: string;
  type: string;
  addedOn: string;
  maxOpenQuantity: number;
  minTradeQuantity: number;
  exchange?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  currentPrice?: number;
  dividendYield?: number;
  peRatio?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface PieInstrument {
  ticker: string;
  fullName?: string;
  addedToMarket?: string;
  currencyCode?: string;
  maxOpenQuantity?: number;
  minTradeQuantity?: string;
  type?: string;
  currentShare: number;
  expectedShare: number;
  issues: boolean;
  ownedQuantity: number;
  investedValue: number;
  currentValue: number;
  resultValue: number;
  dividendYield: number;
  performance_1day?: number | null; // Added 1-day performance
  performance_1week?: number | null;
  performance_1month?: number | null;
  performance_3months?: number | null;
  performance_1year?: number | null;
}

export interface PieData {
  name: string;
  creationDate: string;
  dividendCashAction: string;
  instruments: PieInstrument[];
  totalInvested: number;
  totalResult: number;
  returnPercentage: number;
  fetchDate?: string;
  targetAllocation?: number;
}

export interface OverallSummary {
  overallSummary: {
    totalInvestedOverall: number;
    totalResultOverall: number;
    returnPercentageOverall: number;
    fetchDate: string;
  }
}

export interface AllocationAnalysis {
  targetAllocation: Record<string, { value: number; percent: number }>;
  currentAllocation: Record<string, { value: number; percent: number }>;
  allocationDifferences: Record<string, string>; // Keep as string for formatted output
  estimatedAnnualDividend?: number;
}

export interface PerformanceMetrics {
  portfolio: PieData[] | null;
  overallSummary: OverallSummary | null;
  allocationAnalysis?: AllocationAnalysis;
  rebalanceInvestmentForTarget?: Record<string, { current: number; target: number; difference: number }> | null;
  freeCashAvailable?: number;
  benchmarks?: Benchmark[];
  fetchDate: string;
  plannedInvestmentExpectedDepositDate?: Record<string, string>; // Added optional field
}


export interface InstrumentSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  score: number;
}

export interface WatchlistItem extends InstrumentMetadata {
  addedToWatchlist: string;
  notes?: string;
  targetPrice?: number;
  alertEnabled?: boolean;
}

export interface PieAllocation {
  pieName: string;
  targetAllocation: number;
}

export interface Benchmark {
  name: string;
  returnPercentage: number;
  description?: string;
  lastUpdated?: string;
}

// --- API Client Types ---
export interface ApiRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  delay?: number;
  retries?: number;
}

export interface CacheEntry {
  data: AxiosResponse;
  timestamp: number;
}

// Add AxiosResponse type if not already globally available
// You might need to install axios types: npm install --save-dev @types/axios
import { AxiosResponse } from 'axios';
