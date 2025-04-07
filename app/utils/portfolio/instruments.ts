import { makeApiRequest, API_ENDPOINTS, DEFAULT_HEADERS } from './api-client';
import { InstrumentMetadata, InstrumentSearchResult } from './types';
import yahooFinance from 'yahoo-finance2';
import { subDays, subYears } from 'date-fns';

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
 * Attempts to format a potential Trading 212 ticker symbol for the Yahoo Finance API.
 * Uses a combination of known T212 patterns, common Yahoo Finance suffixes,
 * and educated guesses to maximize resilience without requiring constant manual updates.
 *
 * NOTE: The mapping from potential T212 indicators (last char) to YF suffixes
 * is based on common patterns and *may require refinement* as more T212 examples
 * are observed across different exchanges. This reflects a best effort based on general knowledge.
 *
 * Common Yahoo Finance Exchange Suffixes for Reference:
 * .L (London), .DE (Xetra), .F (Frankfurt), .AS (Amsterdam), .PA (Paris), .BR (Brussels),
 * .SW (Swiss), .VI (Vienna), .MI (Milan), .LS (Lisbon), .MC (Madrid), .HE (Helsinki),
 * .CO (Copenhagen), .OL (Oslo), .ST (Stockholm), .TO (Toronto), .V (TSX Venture),
 * .AX (Australia), .NZ (New Zealand), .HK (Hong Kong), .SI (Singapore), .SS (Shanghai),
 * .SZ (Shenzhen), .T (Tokyo), .TW (Taiwan), .KS (Korea SE), .KQ (KOSDAQ), .IS (Istanbul),
 * .JO (Johannesburg), .SA (Sao Paulo), .BA (Buenos Aires), etc.
 * US/Nasdaq/NYSE often have no suffix.
 *
 * @param ticker - The original ticker symbol (e.g., from Trading 212 API).
 * @param logger - Optional NestJS logger instance for debugging unknowns.
 * @returns Formatted ticker suitable for Yahoo Finance, or the original if formatting fails.
 */
export function formatYahooTicker(ticker: string, logger?: Logger): string {
  // Basic validation
  if (!ticker || typeof ticker !== 'string') {
    logger?.warn(`Invalid ticker input received: ${ticker}`, 'formatYahooTicker');
    return ticker; // Return input if invalid or empty
  }

  // 1. Handle known specific structural overrides first (Keep minimal)
  // These are for cases where general rules are insufficient (e.g., internal character changes).
  const specificTickerMap: Record<string, string> = {
    'BRK_B_US_EQ': 'BRK-B', // Specific case: T212 '_' vs YF '-' for Class B shares
    'KLWD1l_EQ': 'KLWD.L',
    // Add other known unique structural transformations here ONLY if necessary.
  };

  if (ticker in specificTickerMap) {
    logger?.debug(`Applying specific map: ${ticker} -> ${specificTickerMap[ticker]}`, 'formatYahooTicker');
    return specificTickerMap[ticker];
  }

  let formatted = ticker;

  // 2. Check if it already looks like a potential Yahoo Finance format or a known T212 convention with a dot.
  // If T212 sometimes provides tickers like "VUSA.L" or "IWDA.AS" directly, don't alter them.
  if (formatted.includes('.')) {
    // We assume a ticker with a dot is either already correct YF format
    // or uses a specific convention (like DOT.LSE) we shouldn't blindly change.
    // Further refinement possible if specific T212 dot patterns are known (e.g., XXX.YY_EQ).
    logger?.debug(`Ticker "${ticker}" already contains '.', returning as is.`, 'formatYahooTicker');
    return formatted;
  }

  // 3. Remove common "noise" suffixes (potentially added by T212)
  // Process potentially combined suffixes first for cleaner removal.
  const noiseSuffixes: string[] = [
    '_US_EQ', // Example: Handle combined first
    '_EQ',
    '_US',
    // Add others if observed, e.g., _L_EQ? _DE_EQ?
  ];
  let noiseRemoved = false;
  for (const suffix of noiseSuffixes) {
    if (formatted.endsWith(suffix)) {
      formatted = formatted.slice(0, -suffix.length);
      noiseRemoved = true;
      logger?.debug(`Removed noise suffix "${suffix}" from "${ticker}". Current: "${formatted}"`, 'formatYahooTicker');
      // Break after removing one suffix type for simplicity. Re-evaluate if multiple noise suffixes can stack unexpectedly.
      break;
    }
  }

  // 4. Map potential T212 exchange indicators (often last char) to YF suffixes
  //    *** This uses broad knowledge & educated guesses for T212's potential single-char indicators ***
  const exchangeIndicators: Record<string, string> = {
    // Relatively Confident Mappings (based on original code/common exchanges)
    'l': '.L',   // London SE (UK)
    'd': '.DE',  // Deutsche Börse XETRA (Germany). Frankfurt (.F) also exists. T212 likely uses one primarily.
    'a': '.AS',  // Euronext Amsterdam (Netherlands)

    // More Speculative Mappings (Plausible single letters T212 *might* use for other exchanges)
    'p': '.PA',  // Euronext Paris (France)
    'b': '.BR',  // Euronext Brussels (Belgium)
    's': '.SW',  // SIX Swiss Exchange (Switzerland) - Note: YF suffix is 2 chars
    'v': '.VI',  // Wiener Börse / Vienna (Austria)
    'm': '.MI',  // Borsa Italiana / Milan (Italy)
    'h': '.HE',  // Nasdaq Helsinki (Finland)
    'c': '.CO',  // Nasdaq Copenhagen (Denmark)
    'o': '.OL',  // Oslo Bors (Norway)
    't': '.TO',  // Toronto Stock Exchange (Canada) - Plausible, but YF also uses .V for Venture
    'x': '.AX',  // Australian Securities Exchange - Plausible guess for single char
    'k': '.HK',  // Hong Kong Stock Exchange - Plausible guess for single char (YF: .HK)

    // Add more mappings based on observed T212 data or further research...
    // Examples needing investigation: Portugal (.LS), Spain (.MC), Sweden (.ST),
    // Asia ( .SI, .SS, .SZ, .T, .TW, .KS, .KQ), etc.
  };

  let exchangeSuffixApplied = false;
  // Only apply if the potentially cleaned ticker has length > 0
  if (formatted.length > 0) {
      const lastChar = formatted.slice(-1);
      const lastCharLower = lastChar.toLowerCase(); // Normalize case for lookup

      // Check if the last character exists in our indicator map
      if (exchangeIndicators[lastCharLower]) {
          // Additional check: Ensure the last character is a letter. Avoids changing "SYMBOL1" if '1' was accidentally mapped.
          if (lastChar.match(/[a-z]/)) {
              const baseTicker = formatted.slice(0, -1);
              formatted = baseTicker + exchangeIndicators[lastCharLower];
              exchangeSuffixApplied = true;
              logger?.debug(`Applied YF suffix: ${ticker} -> ${formatted}`, 'formatYahooTicker');
          } else {
              logger?.debug(`Last char "${lastChar}" of "${ticker}" matched indicator map but isn't a letter. Ignoring.`, 'formatYahooTicker');
          }
      }
  }

  // 5. Final Result Logic
  if (exchangeSuffixApplied || specificTickerMap[ticker]) {
    // If we applied a specific map or an exchange suffix, return the result.
    return formatted;
  } else {
    // If no specific map, no '.', and no exchange suffix was applied:
    // - It might be a US stock (often no suffix needed after cleaning _US/_EQ).
    // - It might be an unknown format or from an exchange not in our map.
    // Return the cleaned ticker (noise removed). It's the best guess.
    if (noiseRemoved) {
      logger?.debug(`No exchange suffix applied to "${ticker}". Returning cleaned version: "${formatted}" (Assumed US or unknown format).`, 'formatYahooTicker');
    } else {
      // If no noise was removed either, it was likely already in base format (e.g., "MSFT", "GOOGL")
       logger?.debug(`No specific formatting applied to "${ticker}". Returning as is (Assumed US or base format).`, 'formatYahooTicker');
    }
    return formatted;
  }
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
    const pastYear = subYears(now, 5);
    
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
      console.error(`Error fetching chart data for ${formattedTicker} [${ticker}]: ${chartError.message}`);
    }
    
    return {
      dividendYield,
      ...defaultPerformance
    };
  } catch (e: any) {
    console.error(`Error fetching data for ${formattedTicker} [${ticker}] from Yahoo Finance: ${e.message}`);
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
