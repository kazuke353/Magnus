import { makeApiRequest, API_ENDPOINTS, DEFAULT_HEADERS } from './api-client';
import { InstrumentMetadata, InstrumentSearchResult } from './types';
import yahooFinance from 'yahoo-finance2';
import { subDays, subYears } from 'date-fns';

// Suppress Yahoo Finance notices
yahooFinance.suppressNotices(['yahooSurvey']);

/**
 * Fetches all instruments metadata from the API
 * @returns Record of instruments metadata by ticker or null if fetch fails
 */
export async function getAllInstrumentsMetadata(): Promise<Record<string, InstrumentMetadata> | null> {
  const response = await makeApiRequest({
    url: API_ENDPOINTS.INSTRUMENTS_METADATA,
    headers: DEFAULT_HEADERS
  });
  
  if (!response) {
    console.log("Failed to fetch instruments metadata.");
    return null;
  }
  
  try {
    const instruments = response.data as InstrumentMetadata[];
    if (!Array.isArray(instruments)) {
      console.error("Instruments metadata is not an array");
      return null;
    }
    
    const metadataByTicker: Record<string, InstrumentMetadata> = {};
    instruments.forEach(instrument => {
      metadataByTicker[instrument.ticker] = instrument;
    });
    return metadataByTicker;
  } catch (e: any) {
    console.error(`Error parsing instruments metadata: ${e.message}`);
    try {
      console.error(`Response Content: ${JSON.stringify(response.data)}`);
    } catch (e) {
      console.error("No response available");
    }
    return null;
  }
}

/**
 * Formats a ticker symbol for Yahoo Finance API
 * @param ticker Original ticker symbol
 * @returns Formatted ticker for Yahoo Finance
 */
export async function formatYahooTicker(ticker: string): Promise<string> {
  let formatted = ticker;

  if (formatted.endsWith('_EQ')) {
    formatted = formatted.slice(0, -3);
  }
  if (formatted.endsWith('l')) {
    formatted = `${formatted.slice(0, -1)}.L`;
  }
  if (formatted.endsWith('_US')) {
    formatted = formatted.slice(0, -3);
  }
  if (formatted.endsWith('1.L')) {
    formatted = formatted.slice(0, -3) + '.L';
  }

  // Specific ticker formatting
  const tickerMap: Record<string, string> = {
    'BRK_B_US_EQ': 'BRK-B',
    'ALVd_EQ': 'ALV.DE',
    'ABNa_EQ': 'ABN.AS'
  };

  if (ticker in tickerMap) {
    formatted = tickerMap[ticker];
  }

  return formatted;
}

/**
 * Fetches historical performance data for an instrument
 * @param ticker Instrument ticker symbol
 * @returns Object with performance metrics or null values if fetch fails
 */
export async function fetchInstrumentPerformance(ticker: string): Promise<{
  dividendYield: number;
  performance_1week: number | null;
  performance_1month: number | null;
  performance_3months: number | null;
  performance_1year: number | null;
}> {
  const defaultPerformance = {
    dividendYield: 0,
    performance_1week: null,
    performance_1month: null,
    performance_3months: null,
    performance_1year: null
  };
  
  try {
    const formattedTicker = await formatYahooTicker(ticker);
    const yfQuote = await yahooFinance.quote(formattedTicker);
    
    const dividendYield = yfQuote?.dividendYield ? 
      parseFloat(yfQuote.dividendYield.toFixed(2)) : 0.0;

    const now = new Date();
    const pastYear = subYears(now, 1);
    
    try {
      // Using chart() instead of historical()
      const chartData = await yahooFinance.chart(formattedTicker, {
        period1: pastYear,
        period2: now,
        interval: '1d'
      });

      if (chartData && chartData.quotes && chartData.quotes.length > 0) {
        // Sort quotes by date (oldest first)
        const quotes = chartData.quotes.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        const latestQuote = quotes[quotes.length - 1];
        if (!latestQuote || !latestQuote.close) {
          return {
            dividendYield,
            ...defaultPerformance
          };
        }
        
        const todayPrice = latestQuote.close;

        const calculatePerformance = (daysAgo: number): number | null => {
          const pastDate = subDays(now, daysAgo);
          // Find the closest quote to the target date
          const pastQuotes = quotes.filter(item => new Date(item.date) <= pastDate);
          if (pastQuotes.length > 0) {
            const pastQuote = pastQuotes[pastQuotes.length - 1];
            if (pastQuote && pastQuote.close) {
              return ((todayPrice - pastQuote.close) / pastQuote.close) * 100;
            }
          }
          return null;
        };

        return {
          dividendYield,
          performance_1week: calculatePerformance(7),
          performance_1month: calculatePerformance(30),
          performance_3months: calculatePerformance(90),
          performance_1year: calculatePerformance(365)
        };
      }
    } catch (chartError: any) {
      console.error(`Error fetching chart data for ${formattedTicker}: ${chartError.message}`);
    }
    
    return {
      dividendYield,
      ...defaultPerformance
    };
  } catch (e: any) {
    console.error(`Error fetching data for ${ticker} from Yahoo Finance: ${e.message}`);
    return defaultPerformance;
  }
}

/**
 * Search for instruments using Yahoo Finance API
 * @param query Search query string
 * @param limit Maximum number of results to return
 * @returns Array of search results or empty array if search fails
 */
export async function searchInstruments(query: string, limit: number = 10): Promise<InstrumentSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const searchResults = await yahooFinance.search(query, { quotesCount: limit, newsCount: 0 });
    
    if (!searchResults || !searchResults.quotes || searchResults.quotes.length === 0) {
      return [];
    }

    return searchResults.quotes.map(quote => ({
      symbol: quote.symbol,
      name: quote.shortname || quote.longname || quote.symbol,
      exchange: quote.exchange || '',
      type: quote.quoteType || 'EQUITY',
      score: quote.score || 0
    }));
  } catch (e: any) {
    console.error(`Error searching for instruments: ${e.message}`);
    return [];
  }
}

/**
 * Fetches detailed information for a specific instrument
 * @param symbol Instrument symbol
 * @returns Detailed instrument data or null if fetch fails
 */
export async function getInstrumentDetails(symbol: string): Promise<InstrumentMetadata | null> {
  try {
    const formattedSymbol = await formatYahooTicker(symbol);
    const [quoteData, summaryData] = await Promise.all([
      yahooFinance.quote(formattedSymbol),
      yahooFinance.quoteSummary(formattedSymbol, { modules: ['summaryDetail', 'price', 'defaultKeyStatistics'] })
    ]);

    if (!quoteData) {
      return null;
    }

    const price = summaryData?.price || {};
    const summaryDetail = summaryData?.summaryDetail || {};
    const keyStats = summaryData?.defaultKeyStatistics || {};

    // Create a standardized instrument metadata object
    const instrumentData: InstrumentMetadata = {
      ticker: symbol,
      name: price.shortName || price.longName || quoteData.displayName || symbol,
      currencyCode: quoteData.currency || 'USD',
      type: quoteData.quoteType || 'EQUITY',
      addedOn: new Date().toISOString(),
      maxOpenQuantity: 10000, // Default value
      minTradeQuantity: 1,    // Default value
      exchange: quoteData.exchange || '',
      sector: quoteData.sector || '',
      industry: quoteData.industry || '',
      marketCap: quoteData.marketCap || keyStats.marketCap || 0,
      currentPrice: quoteData.regularMarketPrice || 0,
      dividendYield: summaryDetail.dividendYield ? summaryDetail.dividendYield * 100 : 0,
      peRatio: quoteData.pe || summaryDetail.trailingPE || 0,
      beta: summaryDetail.beta || 0,
      fiftyTwoWeekHigh: quoteData.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: quoteData.fiftyTwoWeekLow || 0
    };

    return instrumentData;
  } catch (e: any) {
    console.error(`Error fetching instrument details for ${symbol}: ${e.message}`);
    return null;
  }
}
