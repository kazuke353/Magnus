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
 * Generates a list of potential Yahoo Finance ticker formats based on a T212 ticker.
 * Includes variants with/without trailing numbers before exchange indicators
 * and adds cleaned base versions for specific structural maps.
 * Returns an array of potential tickers, ordered by likelihood, to be tried sequentially.
 *
 * @param ticker - The original ticker symbol (e.g., from Trading 212 API).
 * @returns Array of potential Yahoo Finance ticker strings.
 */
export function formatYahooTicker(ticker: string): string[] {
  // Basic validation
  if (!ticker || typeof ticker !== 'string') {
    console.warn(`Invalid ticker input received: ${ticker}`, 'formatYahooTicker');
    return ticker ? [ticker] : [];
  }

  const potentialTickers = new Set<string>(); // Use Set for automatic deduplication
  let cleanedBaseForSpecific: string | null = null;

  // --- Step 1: Handle known specific structural overrides & Add Cleaned Base ---
  const specificTickerMap: Record<string, string> = {
    'BRK_B_US_EQ': 'BRK-B',
    // Add other unique structural transformations here ONLY if necessary.
  };

  // Define noise suffixes early for reuse if specific map hits
  const noiseSuffixes: string[] = ['_US_EQ', '_EQ', '_US'];

  if (ticker in specificTickerMap) {
    const specificFormat = specificTickerMap[ticker];
    potentialTickers.add(specificFormat); // Add the transformed version first
    console.debug(`[Specific Map] Added transformed: ${specificFormat} for ${ticker}`, 'formatYahooTicker');


    // Calculate and add the 'cleaned base' before transformation as a fallback
    let tempCleaned = ticker;
    for (const suffix of noiseSuffixes) {
      if (tempCleaned.endsWith(suffix)) {
        tempCleaned = tempCleaned.slice(0, -suffix.length);
        break; // Assume only one noise suffix for simplicity here
      }
    }
    // Check if the cleaned base differs from the original ticker and the specific format
    if (tempCleaned !== ticker && tempCleaned !== specificFormat) {
      cleanedBaseForSpecific = tempCleaned; // e.g., BRK_B
      potentialTickers.add(cleanedBaseForSpecific);
      console.debug(`[Specific Map] Added cleaned base fallback: ${cleanedBaseForSpecific} for ${ticker}`, 'formatYahooTicker');
    }
  }

  // --- Step 2: Check for pre-formatted tickers ---
  if (ticker.includes('.')) {
    console.debug(`Ticker "${ticker}" already contains '.', adding only it as candidate.`, 'formatYahooTicker');
    potentialTickers.add(ticker);
    // If specific map added candidates, keep them alongside the original dotted one.
    return Array.from(potentialTickers); // Return early to avoid suffix logic
  }

  // --- Step 3: Noise Removal (General Case) ---
  let cleanedTicker = ticker;
  let noiseRemoved = false;
  for (const suffix of noiseSuffixes) {
    if (cleanedTicker.endsWith(suffix)) {
      cleanedTicker = cleanedTicker.slice(0, -suffix.length);
      noiseRemoved = true;
      break;
    }
  }

  // --- Step 4: Generate Formats (Primary, Alternatives, Number-Removed) ---
  let primaryFormattedTicker: string | null = null;

  // Map T212 indicators -> Array of potential YF Suffixes [Primary, Secondary, ...]
  const exchangeIndicatorMappings: Record<string, string[]> = {
    'l': ['.L'],
    'd': ['.DE', '.F'],
    'a': ['.AS'],
    'p': ['.PA'],
    'b': ['.BR'],
    's': ['.SW'],
    'v': ['.VI'],
    'm': ['.MI'],
    'h': ['.HE'],
    'c': ['.CO'],
    'o': ['.OL'],
    't': ['.TO', '.V'],
    'x': ['.AX'],
    'k': ['.HK'],
  };

  // Only apply if the potentially cleaned ticker has length > 0
  if (cleanedTicker.length > 0) {
    const lastChar = cleanedTicker.slice(-1); // Get last char, preserving case

    // Check if the original last character exists as a key in our indicator map
    // AND verify it's actually a letter (case-insensitive check is fine here)
    if (exchangeIndicatorMappings[lastChar] && lastChar.match(/[a-z]/i)) { // Use lastChar directly for lookup
      const baseWithMaybeNumbers = cleanedTicker.slice(0, -1);
      // Use lastChar directly to get the correct suffixes from the map
      const possibleSuffixes = exchangeIndicatorMappings[lastChar];

      // --- 4a: Add formats WITH current base (may include numbers) ---
      primaryFormattedTicker = baseWithMaybeNumbers + possibleSuffixes[0];
      potentialTickers.add(primaryFormattedTicker);
      console.debug(`[Indicator] Added primary format: ${primaryFormattedTicker} for ${ticker}`, 'formatYahooTicker');

      for (let i = 1; i < possibleSuffixes.length; i++) {
        const altFormat = baseWithMaybeNumbers + possibleSuffixes[i];
        potentialTickers.add(altFormat);
        console.debug(`[Indicator] Added alternative format: ${altFormat} for ${ticker}`, 'formatYahooTicker');
      }

      // --- 4b: Add formats WITHOUT trailing numbers (if base ends in numbers) ---
      const numberMatch = baseWithMaybeNumbers.match(/^(.*?)(\d+)$/);
      if (numberMatch) {
        const baseWithoutNumbers = numberMatch[1];
        if (baseWithoutNumbers.length > 0) {
          const numRemovedPrimary = baseWithoutNumbers + possibleSuffixes[0];
          potentialTickers.add(numRemovedPrimary);
          console.debug(`[Indicator NumRemoved] Added primary: ${numRemovedPrimary} for ${ticker}`, 'formatYahooTicker');

          for (let i = 1; i < possibleSuffixes.length; i++) {
            const numRemovedAlt = baseWithoutNumbers + possibleSuffixes[i];
            potentialTickers.add(numRemovedAlt);
            console.debug(`[Indicator NumRemoved] Added alternative: ${numRemovedAlt} for ${ticker}`, 'formatYahooTicker');
          }
        }
      }
    }
  }

  // --- Step 5: Add Fallbacks ---
  // Add the standard cleaned ticker (e.g., KLWD1l after _EQ removed, or MSFT, or BRK_B)
  // This is a crucial fallback if no indicator logic applied or was wrong.
  potentialTickers.add(cleanedTicker);
  console.debug(`[Fallback] Added cleaned base: ${cleanedTicker} for ${ticker}`, 'formatYahooTicker');

  // Add the original ticker ONLY IF no changes happened at all (no specific map, no noise removal, no suffix applied)
  // Useful for cases like "AAPL" or completely unrecognized formats.
  if (!noiseRemoved && !primaryFormattedTicker && !(ticker in specificTickerMap)) {
    potentialTickers.add(ticker);
    console.debug(`[Fallback] Added original ticker (no changes detected): ${ticker}`, 'formatYahooTicker');
  }

  // --- Step 6: Final Array ---
  const orderedTickers = Array.from(potentialTickers);
  // The Set insertion order likely prioritizes reasonably well, but could be explicitly sorted if needed.

  console.log(`Generated potential tickers for "${ticker}": [${orderedTickers.join(', ')}]`, 'formatYahooTicker');
  return orderedTickers;
}

/**
 * Fetches historical performance data for an instrument
 * @param ticker Instrument ticker symbol
 * @returns Object with performance metrics or null values if fetch fails
 */
export async function fetchInstrumentPerformance(ticker: string): Promise<{
  dividendYield: number;
  performance_1day: number | null;
  performance_1week: number | null;
  performance_1month: number | null;
  performance_3months: number | null;
  performance_1year: number | null;
}> {
  const defaultPerformance = {
    dividendYield: 0,
    performance_1day: null,
    performance_1week: null,
    performance_1month: null,
    performance_3months: null,
    performance_1year: null
  };
  const potentialTickers = formatYahooTicker(ticker); // Get the array

  if (potentialTickers.length === 0) {
    console.error(`No potential tickers generated for input: ${ticker}`);
    return defaultPerformance;
  }

  for (const attemptTicker of potentialTickers) {
    try {
      const yfQuote = await yahooFinance.quote(attemptTicker);

      const dividendYield = yfQuote?.dividendYield ?
        parseFloat(yfQuote.dividendYield.toFixed(2)) : 0.0;

      const now = new Date();
      const pastYear = subYears(now, 5);

      // Using chart() instead of historical()
      const chartData = await yahooFinance.chart(attemptTicker, {
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
          performance_1day: calculatePerformance(1),
          performance_1week: calculatePerformance(7),
          performance_1month: calculatePerformance(30),
          performance_3months: calculatePerformance(90),
          performance_1year: calculatePerformance(365)
        };
      } else {
        console.warn(`No chart data or quotes returned for ${attemptTicker}`);
        // Continue to next potential ticker if no chart data
      }
    } catch (e: any) {
      // Check if error indicates "Not Found" or similar
      // NOTE: This error message check is fragile and depends on yahoo-finance2's output
      const errorMsg = e.message?.toLowerCase() || '';
      if (errorMsg.includes('not found') || errorMsg.includes('failed') || errorMsg.includes('symbol may be delisted')) {
        console.debug(`Ticker format ${attemptTicker} failed (Not Found/Failed): ${e.message}`);
      } else {
        // Log unexpected errors more prominently
        console.error(`Unexpected error fetching data for ${attemptTicker} [${ticker}]: ${e.message}`);
        // Depending on the error, you might want to break or stop retrying
      }
      // Continue to the next potential ticker format
    }
  }

  // If loop completes without success
  console.error(`Failed to fetch performance for ${ticker} after trying all formats: [${potentialTickers.join(', ')}]`);
  return defaultPerformance; // <<-- Return FAILURE DEFAULT
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
  const potentialTickers = formatYahooTicker(symbol);

  if (potentialTickers.length === 0) {
    console.error(`No potential tickers generated for input: ${symbol}`);
    return null;
  }

  for (const attemptTicker of potentialTickers) {
    try {
      console.debug(`Attempting to fetch details for ${attemptTicker} [Original: ${symbol}]`);
      // --- Try fetching data with this attemptTicker ---
      const [quoteData, summaryData] = await Promise.all([
        yahooFinance.quote(attemptTicker),
        // Add specific modules for potentially better data coverage
        yahooFinance.quoteSummary(attemptTicker, { modules: ["price", "summaryDetail", "defaultKeyStatistics", "financialData"] })
      ]);

      // Check if essential data is present
      if (!quoteData || !summaryData?.price) {
        console.warn(`Incomplete data received for ${attemptTicker}. Quote: ${!!quoteData}, Summary: ${!!summaryData?.price}`);
        continue; // Try next ticker if core data missing
      }

      const price = summaryData.price;
      const summaryDetail = summaryData.summaryDetail || {};
      const keyStats = summaryData.defaultKeyStatistics || {};
      const financialData = summaryData.financialData || {}; // Added module

      // Create a standardized instrument metadata object
      const instrumentData: InstrumentMetadata = {
        ticker: symbol, // Use original T212 ticker for consistency in your app
        name: price.shortName || price.longName || quoteData.displayName || attemptTicker, // Best available name
        currencyCode: financialData.financialCurrency || quoteData.currency || 'USD', // financialData often better
        type: quoteData.quoteType || 'EQUITY',
        addedOn: new Date().toISOString(),
        maxOpenQuantity: 10000, // Placeholder - Should this come from T212 data?
        minTradeQuantity: 1,    // Placeholder - Should this come from T212 data?
        exchange: quoteData.exchange || '',
        sector: keyStats.sector || '', // sector/industry often in keyStats
        industry: keyStats.industry || '',
        marketCap: quoteData.marketCap || keyStats.marketCap || 0,
        currentPrice: financialData.currentPrice ?? quoteData.regularMarketPrice ?? 0, // financialData often better
        // Ensure dividendYield calculation handles potential null/undefined and multiplies correctly
        dividendYield: typeof summaryDetail.dividendYield === 'number' ? summaryDetail.dividendYield * 100 : 0,
        peRatio: summaryDetail.trailingPE ?? keyStats.trailingPE ?? 0,
        beta: summaryDetail.beta ?? keyStats.beta ?? 0,
        fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh ?? quoteData.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow ?? quoteData.fiftyTwoWeekLow ?? 0,
      };
      console.log(`Successfully fetched details for ${attemptTicker}`);
      return instrumentData; // <<-- Return SUCCESS
      // --- End fetching logic ---
    } catch (e: any) {
      const errorMsg = e.message?.toLowerCase() || '';
      if (errorMsg.includes('not found') || errorMsg.includes('failed') || errorMsg.includes('symbol may be delisted')) {
        console.debug(`Ticker format ${attemptTicker} failed (Not Found/Failed): ${e.message}`);
      } else {
        console.error(`Unexpected error fetching details for ${attemptTicker} [${symbol}]: ${e.message}`);
      }
      // Continue to the next potential ticker format
    }
  }

  // If loop completes without success
  console.error(`Failed to fetch details for ${symbol} after trying all formats: [${potentialTickers.join(', ')}]`);
  return null; // <<-- Return FAILURE NULL
}
