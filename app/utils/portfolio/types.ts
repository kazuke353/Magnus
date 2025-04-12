export interface InstrumentMetadata {
  ticker: string;
  name: string;
  currencyCode: string;
  type: string;
  addedOn: string;
  // Removed maxOpenQuantity and minTradeQuantity
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
  // Removed maxOpenQuantity and minTradeQuantity
  type?: string;
  pieCurrentAllocation: number; // Renamed from currentShare
  pieTargetAllocation: number; // Renamed from expectedShare
  issues: boolean;
  ownedQuantity: number;
  investedValue: number;
  currentValue: number;
  resultValue: number;
  dividendYield: number;
  performance_1day?: number | null;
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

export interface HistoricalDataPoint {
  date: string; // YYYY-MM-DD
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
  adjClose?: number; // Optional adjusted close
}

export interface RecommendationTrend {
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
  period: string; // e.g., '0m'
}

export interface EarningsHistoryEntry {
    epsActual: number | null;
    epsEstimate: number | null;
    epsDifference: number | null;
    surprisePercent: number | null;
    quarter: string; // e.g., "4q2023"
    period: string; // e.g., "-4q"
}

// Update FetchedInstrumentDetails to include the new data structures
export interface FetchedInstrumentDetails extends InstrumentMetadata {
  // Basic data still inherited from InstrumentMetadata
  previousClose?: number; // Often in summaryDetail
  // Complex fields we attempt to fetch:
  historicalData?: HistoricalDataPoint[];
  recommendationTrend?: RecommendationTrend[]; // Analyst recommendations
  earningsHistory?: EarningsHistoryEntry[]; // Past earnings data
  // Fields that are harder to get reliably / omitted:
  analystScorecard?: any; // Replace with recommendationTrend
  keyMetrics?: any; // Omit for now, complex to structure consistently
  yearlyHighLow?: any; // 52-week high/low is already included
}

import { AxiosResponse } from 'axios';
