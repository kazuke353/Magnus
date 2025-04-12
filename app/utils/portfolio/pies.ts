import { format } from 'date-fns';
import { makeApiRequest, API_ENDPOINTS } from './api-client'; // Removed DEFAULT_HEADERS
import { getAllInstrumentsMetadata } from './instruments';
import { fetchInstrumentPerformance } from './instruments';
import {
  PieData,
  PieInstrument,
  InstrumentMetadata,
  OverallSummary,
  PieAllocation
} from './types';
import { getTargetAllocations } from './allocation';

/**
 * Fetches details for a specific pie for a given user.
 * @param userId The ID of the user.
 * @param pieId Pie identifier.
 * @param allInstrumentsMetadata Metadata for all instruments.
 * @returns Pie data or null if fetch fails.
 */
export async function fetchPieDetails(
  userId: string, // Add userId
  pieId: string,
  allInstrumentsMetadata: Record<string, InstrumentMetadata>
): Promise<PieData | null> {
  const pieDetailsURL = API_ENDPOINTS.getPieDetails(pieId);
  const response = await makeApiRequest({
    url: pieDetailsURL,
    userId: userId // Pass userId
  });

  if (!response) {
    console.log(`Could not fetch details for pie ID ${pieId} for user ${userId}`);
    return null;
  }

  try {
    const pieDetails = response.data;
    const settings = pieDetails.settings || {};
    const pieData: PieData = {
      name: settings.name || 'Unnamed Pie',
      creationDate: settings.creationDate || new Date().toISOString(),
      dividendCashAction: settings.dividendCashAction || 'unknown',
      instruments: [],
      totalInvested: 0,
      totalResult: 0,
      returnPercentage: 0
    };

    // Try to extract allocation from name
    const percentMatch = pieData.name.match(/\((\d+(?:\.\d+)?)%\)/);
    if (percentMatch && percentMatch[1]) {
      pieData.targetAllocation = parseFloat(percentMatch[1]);
    }

    const instruments = pieDetails.instruments || [];
    // Use Promise.all for concurrent instrument performance fetching
    const instrumentPromises = instruments.map(async (instrument: any) => {
      const result = instrument.result || {};
      const ticker = instrument.ticker || '';

      const instrumentData: PieInstrument = {
        pieCurrentAllocation: instrument.currentShare * 100 || 0, // Renamed and assigned
        pieTargetAllocation: instrument.expectedShare * 100 || 0, // Renamed and assigned
        issues: instrument.issues || false,
        ownedQuantity: instrument.ownedQuantity || 0,
        ticker: ticker,
        investedValue: result.priceAvgInvestedValue || 0,
        currentValue: result.priceAvgValue || 0,
        resultValue: (result.priceAvgValue || 0) - (result.priceAvgInvestedValue || 0),
        dividendYield: 0 // Initialize
      };

      // Add metadata if available
      if (ticker && allInstrumentsMetadata && ticker in allInstrumentsMetadata) {
        const fullInstrumentData = allInstrumentsMetadata[ticker];
        instrumentData.fullName = fullInstrumentData.name;
        instrumentData.addedToMarket = fullInstrumentData.addedOn;
        instrumentData.currencyCode = fullInstrumentData.currencyCode;
        // Removed maxOpenQuantity and minTradeQuantity assignments
        instrumentData.type = fullInstrumentData.type;
      }

      // Fetch performance data concurrently
      if (ticker) {
        try {
          const performanceData = await fetchInstrumentPerformance(ticker);
          Object.assign(instrumentData, performanceData);
        } catch (perfError) {
          console.error(`Failed to fetch performance for ${ticker}:`, perfError);
          // Assign default/null values if performance fetch fails
          instrumentData.dividendYield = 0;
          instrumentData.performance_1day = null; // Added default
          instrumentData.performance_1week = null;
          instrumentData.performance_1month = null;
          instrumentData.performance_3months = null;
          instrumentData.performance_1year = null;
        }
      }


      return instrumentData;
    });

    // Wait for all instrument data (including performance) to be fetched
    pieData.instruments = await Promise.all(instrumentPromises);

    // Calculate totals after all instruments are processed
    pieData.totalInvested = pieData.instruments.reduce((sum, instr) => sum + instr.investedValue, 0);
    pieData.totalResult = pieData.instruments.reduce((sum, instr) => sum + instr.resultValue, 0);
    pieData.returnPercentage = pieData.totalInvested !== 0 ?
      (pieData.totalResult / pieData.totalInvested) * 100 : 0;
    pieData.fetchDate = format(new Date(), "yyyy-MM-dd HH:mm:ss");

    return pieData;

  } catch (e: any) {
    console.error(`Error processing pie details for pie ID ${pieId} (User: ${userId}): ${e.message}`);
    try {
      console.error(`Response Content: ${JSON.stringify(response.data)}`);
    } catch (parseErr) {
      console.error("Could not parse error response content.");
    }
    return null;
  }
}

/**
 * Fetches data for all pies for a specific user.
 * @param userId The ID of the user.
 * @param allInstrumentsMetadata Metadata for all instruments.
 * @param delayBetweenPies Delay between API calls in seconds.
 * @returns Array of pie data and overall summary.
 */
export async function getAllPiesData(
  userId: string, // Add userId
  allInstrumentsMetadata: Record<string, InstrumentMetadata>,
  delayBetweenPies: number = 1
): Promise<[PieData[] | null, OverallSummary | null]> {
  const response = await makeApiRequest({
    url: API_ENDPOINTS.PIES_LIST,
    userId: userId // Pass userId
  });

  if (!response) {
    console.log(`Failed to fetch list of pies for user ${userId}.`);
    return [null, null];
  }

  try {
    const piesList = response.data;
    if (!Array.isArray(piesList)) {
      console.error(`Pies list is not an array for user ${userId}`);
      return [null, null];
    }

    const allPies: PieData[] = [];
    let totalInvestedOverall = 0;
    let totalResultOverall = 0;

    // Use Promise.all to fetch pie details concurrently (with delays managed internally if needed)
    const pieDetailPromises = piesList.map(async (pie, index) => {
      const pieId = pie.id;
      if (!pieId) {
        console.warn(`Pie without ID encountered for user ${userId}, skipping`);
        return null;
      }

      // Optional: Add delay here if needed *between starting* fetches,
      // though Promise.all runs them concurrently once started.
      // If strict sequential fetching with delay is required, use a for...of loop as before.
      // await new Promise(resolve => setTimeout(resolve, index * delayBetweenPies * 1000)); // Stagger start

      return fetchPieDetails(userId, pieId, allInstrumentsMetadata); // Pass userId
    });

    const resolvedPies = await Promise.all(pieDetailPromises);

    resolvedPies.forEach(pieData => {
      if (pieData) {
        allPies.push(pieData);
        totalInvestedOverall += pieData.totalInvested || 0;
        totalResultOverall += pieData.totalResult || 0;
      }
    });


    const returnPercentageOverall = totalInvestedOverall !== 0 ?
      (totalResultOverall / totalInvestedOverall) * 100 : 0;
    const fetchDate = format(new Date(), "yyyy-MM-dd HH:mm:ss");

    const overallSummary: OverallSummary = {
      overallSummary: {
        totalInvestedOverall,
        totalResultOverall,
        returnPercentageOverall,
        fetchDate
      }
    };

    return [allPies, overallSummary];

  } catch (e: any) {
    console.error(`Error parsing list of pies for user ${userId}: ${e.message}`);
    try {
      console.error(`Response Content: ${JSON.stringify(response.data)}`);
    } catch (parseErr) {
      console.error("Could not parse error response content.");
    }
    return [null, null];
  }
}
