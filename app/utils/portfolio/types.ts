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
