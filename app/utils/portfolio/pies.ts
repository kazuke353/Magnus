import { format } from 'date-fns';
import { makeApiRequest, API_ENDPOINTS, DEFAULT_HEADERS } from './api-client';
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
 * Fetches details for a specific pie
 * @param pieId Pie identifier
 * @param allInstrumentsMetadata Metadata for all instruments
 * @returns Pie data or null if fetch fails
 */
export async function fetchPieDetails(
  pieId: string, 
  allInstrumentsMetadata: Record<string, InstrumentMetadata>
): Promise<PieData | null> {
  const pieDetailsURL = API_ENDPOINTS.getPieDetails(pieId);
  const response = await makeApiRequest({
    url: pieDetailsURL,
    headers: DEFAULT_HEADERS
  });
  
  if (!response) {
    console.log(`Could not fetch details for pie ID ${pieId}`);
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
    for (const instrument of instruments) {
      const result = instrument.result || {};
      const instrumentData: PieInstrument = {
        currentShare: instrument.currentShare || 0,
        expectedShare: instrument.expectedShare || 0,
        issues: instrument.issues || false,
        ownedQuantity: instrument.ownedQuantity || 0,
        ticker: instrument.ticker || '',
        investedValue: result.priceAvgInvestedValue || 0,
        currentValue: result.priceAvgValue || 0,
        resultValue: (result.priceAvgValue || 0) - (result.priceAvgInvestedValue || 0),
        dividendYield: 0
      };

      const ticker = instrument.ticker;
      if (ticker && allInstrumentsMetadata && ticker in allInstrumentsMetadata) {
        const fullInstrumentData = allInstrumentsMetadata[ticker];
        instrumentData.fullName = fullInstrumentData.name;
        instrumentData.addedToMarket = fullInstrumentData.addedOn;
        instrumentData.currencyCode = fullInstrumentData.currencyCode;
        instrumentData.maxOpenQuantity = fullInstrumentData.maxOpenQuantity;
        instrumentData.minTradeQuantity = String(fullInstrumentData.minTradeQuantity);
        instrumentData.type = fullInstrumentData.type;
      }

      // Fetch performance data
      const performanceData = await fetchInstrumentPerformance(ticker);
      Object.assign(instrumentData, performanceData);

      pieData.instruments.push(instrumentData);
    }

    // Calculate totals
    pieData.totalInvested = pieData.instruments.reduce((sum, instr) => sum + instr.investedValue, 0);
    pieData.totalResult = pieData.instruments.reduce((sum, instr) => sum + instr.resultValue, 0);
    pieData.returnPercentage = pieData.totalInvested !== 0 ? 
      (pieData.totalResult / pieData.totalInvested) * 100 : 0;
    pieData.fetchDate = format(new Date(), "yyyy-MM-dd HH:mm:ss");

    return pieData;

  } catch (e: any) {
    console.error(`Error processing pie details for pie ID ${pieId}: ${e.message}`);
    try {
      console.error(`Response Content: ${JSON.stringify(response.data)}`);
    } catch (e) {
      console.error("No response available");
    }
    return null;
  }
}

/**
 * Fetches data for all pies
 * @param allInstrumentsMetadata Metadata for all instruments
 * @param delayBetweenPies Delay between API calls in seconds
 * @returns Array of pie data and overall summary
 */
export async function getAllPiesData(
  allInstrumentsMetadata: Record<string, InstrumentMetadata>, 
  delayBetweenPies: number = 1
): Promise<[PieData[] | null, OverallSummary | null]> {
  const response = await makeApiRequest({
    url: API_ENDPOINTS.PIES_LIST,
    headers: DEFAULT_HEADERS
  });
  
  if (!response) {
    console.log("Failed to fetch list of pies.");
    return [null, null];
  }

  try {
    const piesList = response.data;
    if (!Array.isArray(piesList)) {
      console.error("Pies list is not an array");
      return [null, null];
    }

    const allPies: PieData[] = [];
    let totalInvestedOverall = 0;
    let totalResultOverall = 0;

    for (const pie of piesList) {
      const pieId = pie.id;
      if (!pieId) {
        console.warn("Pie without ID encountered, skipping");
        continue;
      }

      const pieData = await fetchPieDetails(pieId, allInstrumentsMetadata);
      if (pieData) {
        allPies.push(pieData);
        totalInvestedOverall += pieData.totalInvested || 0;
        totalResultOverall += pieData.totalResult || 0;
      }
      
      // Add delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, delayBetweenPies * 1000));
    }

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
    console.error(`Error parsing list of pies: ${e.message}`);
    try {
      console.error(`Response Content: ${JSON.stringify(response.data)}`);
    } catch (e) {
      console.error("No response available");
    }
    return [null, null];
  }
}
