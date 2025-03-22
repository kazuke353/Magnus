import yahooFinance from 'yahoo-finance2';
import { format, subDays, subMonths, subYears } from 'date-fns';
import axios, { AxiosResponse } from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

// Environment variables & configuration
const api_key = process.env.API_KEY;
if (!api_key) {
  throw new Error('API_KEY environment variable is not set');
}

const headers = { "Authorization": api_key, "Accept": "application/json" };

// API endpoints
const piesListURL = "https://live.trading212.com/api/v0/equity/pies";
const instrumentsMetadataURL = "https://live.trading212.com/api/v0/equity/metadata/instruments";
const cashURL = "https://live.trading212.com/api/v0/equity/account/cash";

// In-memory cache for API responses
interface CacheEntry {
  data: any;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();
const CACHE_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes

// Interfaces
export interface InstrumentMetadata {
    ticker: string;
    name: string;
    currencyCode: string;
    type: string;
    addedOn: string;
    maxOpenQuantity: number;
    minTradeQuantity: number;
}

export interface PieInstrument {
    currentShare: number;
    expectedShare: number;
    issues: boolean;
    ownedQuantity: number;
    ticker: string;
    investedValue: number;
    currentValue: number;
    resultValue: number;
    fullName?: string;
    addedToMarket?: string;
    currencyCode?: string;
    maxOpenQuantity?: number;
    minTradeQuantity?: string;
    type?: string;
    dividendYield: number;
    performance_1week?: number | null;
    performance_1month?: number | null;
    performance_3months?: number | null;
    performance_1year?: number | null;
    [key: string]: any; // Allow extra properties
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
    [key: string]: any; // Allow extra properties
}

export interface OverallSummary {
    overallSummary: {
        totalInvestedOverall: number;
        totalResultOverall: number;
        returnPercentageOverall: number;
        fetchDate?: string;
    }
}

export interface AllocationAnalysis {
    targetAllocation: FormattedAllocation;
    currentAllocation: FormattedAllocation;
    allocationDifferences: AllocationDifferences;
    estimatedAnnualDividend: number;
}

export interface FormattedAllocation {
    [pieType: string]: string;
}

export interface AllocationDifferences {
    [pieType: string]: string;
}

export interface CurrentAllocation {
    [pieType: string]: number;
}

export interface TargetAllocationPercentages {
    [pieType: string]: number;
}

export interface PercentAllocation {
    [pieType: string]: number;
}

export interface TargetInvestments {
    [pieType: string]: number;
}

export interface PerformanceMetrics {
    portfolio?: PieData[] | null;
    overallSummary?: OverallSummary | null;
    allocationAnalysis?: AllocationAnalysis;
    rebalanceInvestmentForTarget?: TargetInvestments | null;
    freeCashAvailable: number;
    totalInvestedOverall?: number;
    totalResultOverall?: number;
    returnPercentageOverall?: number;
    fetchDate?: string;
    [key: string]: any; // Allow extra properties
}

// API request with exponential backoff
async function exponentialBackoffRequest(
    url: string, 
    method: 'GET' | 'POST' = 'GET', 
    headers: Record<string, string>, 
    delay: number = 5, 
    retries: number = 3
): Promise<AxiosResponse | null> {
    const cacheKey = `${method}:${url}`;
    const cachedResponse = apiCache.get(cacheKey);

    // Return cached response if valid
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_EXPIRATION_TIME) {
        return cachedResponse.data;
    }

    let attempts = 0;
    while (attempts <= retries) {
        try {
            const response = await axios({
                method,
                url,
                headers,
                timeout: 10000 // 10 second timeout
            });
            
            if (response.status >= 200 && response.status < 300) {
                apiCache.set(cacheKey, { data: response, timestamp: Date.now() });
                console.log(`Request for ${url} successful.`);
                return response;
            } else {
                console.log(`Request for ${url} failed with status ${response.status}, retrying in ${delay} seconds...`);
            }
        } catch (error: any) {
            console.error(`Request error for ${url}: ${error.message}, retrying in ${delay} seconds...`);
            if (error.response) {
                console.error(`Response details: status ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
            }
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
        delay *= 2;
    }
    console.error(`Failed after ${retries} retries for ${url}.`);
    return null;
}

// Fetch all instruments metadata
async function getAllInstrumentsMetadata(): Promise<Record<string, InstrumentMetadata> | null> {
    const response = await exponentialBackoffRequest(instrumentsMetadataURL, 'GET', headers, 5);
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

// Format Yahoo Finance ticker
async function formatYahooTicker(ticker: string): Promise<string> {
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

// Fetch details for a specific pie
async function fetchPieDetails(
    pieId: string, 
    allInstrumentsMetadata: Record<string, InstrumentMetadata>
): Promise<PieData | null> {
    const pieDetailsURL = `${piesListURL}/${pieId}`;
    const response = await exponentialBackoffRequest(pieDetailsURL, 'GET', headers, 5);
    
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

            try {
                const formattedTicker = await formatYahooTicker(ticker);
                const yfQuote = await yahooFinance.quote(formattedTicker);
                
                instrumentData.dividendYield = yfQuote?.dividendYield ? 
                    parseFloat(yfQuote.dividendYield.toFixed(2)) : 0.0;

                const now = new Date();
                const pastYear = subYears(now, 1);
                const queryOptions = { period1: pastYear, interval: '1d' };
                
                try {
                    const historicalData = await yahooFinance.historical(formattedTicker, queryOptions);

                    if (historicalData && historicalData.length > 0) {
                        const todayPrice = historicalData[historicalData.length - 1].close;

                        const calculatePerformance = (daysAgo: number): number | null => {
                            const pastDate = subDays(now, daysAgo);
                            const pastData = historicalData.filter(item => new Date(item.date) <= pastDate);
                            if (pastData.length > 0) {
                                const pastPrice = pastData[pastData.length - 1].close;
                                return ((todayPrice - pastPrice) / pastPrice) * 100;
                            }
                            return null;
                        };

                        instrumentData.performance_1week = calculatePerformance(7);
                        instrumentData.performance_1month = calculatePerformance(30);
                        instrumentData.performance_3months = calculatePerformance(90);
                        instrumentData.performance_1year = calculatePerformance(365);
                    } else {
                        console.warn(`No historical data fetched for ${formattedTicker}`);
                        instrumentData.performance_1week = null;
                        instrumentData.performance_1month = null;
                        instrumentData.performance_3months = null;
                        instrumentData.performance_1year = null;
                    }
                } catch (histError: any) {
                    console.error(`Error fetching historical data for ${formattedTicker}: ${histError.message}`);
                    instrumentData.performance_1week = null;
                    instrumentData.performance_1month = null;
                    instrumentData.performance_3months = null;
                    instrumentData.performance_1year = null;
                }
            } catch (e: any) {
                console.error(`Error fetching data for ${ticker} from Yahoo Finance: ${e.message}`);
                instrumentData.dividendYield = 0.0;
                instrumentData.performance_1week = null;
                instrumentData.performance_1month = null;
                instrumentData.performance_3months = null;
                instrumentData.performance_1year = null;
            }

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

// Fetch data for all pies
async function getAllPiesData(
    allInstrumentsMetadata: Record<string, InstrumentMetadata>, 
    delayBetweenPies: number = 1
): Promise<[PieData[] | null, OverallSummary | null]> {
    const response = await exponentialBackoffRequest(piesListURL, 'GET', headers, 5);
    
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

// Portfolio data validation
function validatePortfolioData(portfolioData: any): boolean {
    if (typeof portfolioData !== 'object' || 
        portfolioData === null || 
        !('portfolio' in portfolioData)) {
        console.error("Invalid portfolio data format.");
        return false;
    }
    return true;
}

// Extract overall summary
function extractOverallSummary(portfolioData: PerformanceMetrics): OverallSummary | null {
    if (!portfolioData.overallSummary) {
        console.error("No overall summary found");
        return null;
    }
    return portfolioData.overallSummary;
}

// Extract pies (excluding overallSummary)
function extractPies(portfolio: PieData[] | null | undefined): PieData[] {
    if (!portfolio || !Array.isArray(portfolio)) {
        return [];
    }
    return portfolio.filter(pie => pie.name !== "OverallSummary");
}

// Calculate basic performance metrics
function calculateBasicPerformanceMetrics(overallSummary: OverallSummary): Record<string, number> {
    const os = overallSummary.overallSummary;
    return {
        totalInvested: os.totalInvestedOverall,
        totalResult: os.totalResultOverall,
        returnPercentage: os.returnPercentageOverall,
    };
}

// Calculate estimated annual dividend with budget impact
function calculateEstimatedAnnualDividend(portfolioData: PerformanceMetrics, budget: number): number {
    let totalAnnualDividend = 0;
    const annualBudget = budget * 12;

    if (!portfolioData.portfolio || !Array.isArray(portfolioData.portfolio)) {
        return 0;
    }

    // Calculate total portfolio value
    let totalPortfolioValue = 0;
    for (const pie of portfolioData.portfolio) {
        if (pie.instruments && Array.isArray(pie.instruments)) {
            for (const instrument of pie.instruments) {
                totalPortfolioValue += instrument.currentValue || 0;
            }
        }
    }

    // Calculate dividend yield
    for (const pie of portfolioData.portfolio) {
        if (pie.instruments && Array.isArray(pie.instruments)) {
            for (const instrument of pie.instruments) {
                const dividendYield = instrument.dividendYield || 0;
                const currentValue = instrument.currentValue || 0;
                
                // Current dividend
                const annualDividendInstrument = (currentValue * dividendYield) / 100;
                totalAnnualDividend += annualDividendInstrument;

                // Future dividend from budget allocation
                const allocationRatio = totalPortfolioValue > 0 ? 
                    currentValue / totalPortfolioValue : 0;
                const budgetAllocation = annualBudget * allocationRatio;
                const annualDividendFromBudget = (budgetAllocation * dividendYield) / 100;
                totalAnnualDividend += annualDividendFromBudget;
            }
        }
    }

    return totalAnnualDividend;
}

// Extract pie type and target allocation from pie name
function extractTargetAllocationFromName(pieName: string): [string | null, number | null] {
    const parts = pieName.split(" (");
    if (parts.length !== 2) {
        return [null, null];
    }
    
    try {
        const pieType = parts[0].trim();
        const percentageStr = parts[1].replace(')', '').trim();
        const targetAllocation = parseFloat(percentageStr);
        
        if (isNaN(targetAllocation)) {
            return [null, null];
        }
        
        return [pieType, targetAllocation];
    } catch (error) {
        console.warn(`Failed to parse allocation from pie name: ${pieName}`);
        return [null, null];
    }
}

// Calculate current and target allocation
function calculateCurrentAllocation(pies: PieData[]): [CurrentAllocation, TargetAllocationPercentages] {
    const currentAllocation: CurrentAllocation = {};
    const targetAllocationPercentages: TargetAllocationPercentages = {};
    
    for (const pie of pies) {
        const [pieType, targetAllocation] = extractTargetAllocationFromName(pie.name);
        
        if (pieType && targetAllocation !== null) {
            currentAllocation[pieType] = (currentAllocation[pieType] || 0) + pie.totalInvested;
            targetAllocationPercentages[pieType] = targetAllocation;
        }
    }
    
    return [currentAllocation, targetAllocationPercentages];
}

// Calculate percentage allocation
function calculatePercentAllocation(currentAllocation: CurrentAllocation): PercentAllocation {
    const totalCurrentAllocation = Object.values(currentAllocation).reduce((sum, val) => sum + val, 0);
    const percentAllocation: PercentAllocation = {};
    
    for (const pieType in currentAllocation) {
        percentAllocation[pieType] = totalCurrentAllocation > 0 ? 
            (currentAllocation[pieType] / totalCurrentAllocation) * 100 : 0;
    }
    
    return percentAllocation;
}

// Format allocation for display
function formatAllocation(
    allocation: CurrentAllocation | TargetAllocationPercentages, 
    percentAllocation?: PercentAllocation, 
    isTarget: boolean = false
): FormattedAllocation {
    const formattedAllocation: FormattedAllocation = {};
    
    for (const key in allocation) {
        const value = allocation[key];
        
        if (isTarget) {
            formattedAllocation[key] = `${value.toFixed(2)}%`;
        } else if (!percentAllocation) {
            formattedAllocation[key] = `${value.toFixed(2)}%`;
        } else {
            // Changed to only show percentage, not currency amount
            formattedAllocation[key] = `${percentAllocation[key].toFixed(2)}%`;
        }
    }
    
    return formattedAllocation;
}

// Calculate allocation differences
function calculateAllocationDifferences(
    percentAllocation: PercentAllocation, 
    targetAllocation: TargetAllocationPercentages
): AllocationDifferences {
    const allocationDifferences: AllocationDifferences = {};
    
    for (const pieType in targetAllocation) {
        const target = targetAllocation[pieType];
        const current = percentAllocation[pieType] || 0;
        allocationDifferences[pieType] = `${(target - current).toFixed(2)}%`;
    }
    
    return allocationDifferences;
}

// Calculate portfolio performance metrics and allocation analysis
function calculatePerformanceMetrics(portfolioData: PerformanceMetrics, budget: number): AllocationAnalysis | null {
    if (!validatePortfolioData(portfolioData)) {
        return null;
    }
    
    const overallSummary = extractOverallSummary(portfolioData);
    if (!overallSummary) {
        return null;
    }
    
    const pies = extractPies(portfolioData.portfolio);
    
    const [currentAllocation, targetAllocationPercentages] = calculateCurrentAllocation(pies);
    const percentAllocation = calculatePercentAllocation(currentAllocation);

    const formattedCurrentAllocation = formatAllocation(currentAllocation, percentAllocation);
    const formattedTargetAllocation = formatAllocation(targetAllocationPercentages, undefined, true);
    const formattedAllocationDifferences = calculateAllocationDifferences(
        percentAllocation, 
        targetAllocationPercentages
    );
    
    const estimatedAnnualDividend = calculateEstimatedAnnualDividend(portfolioData, budget);

    return {
        targetAllocation: formattedTargetAllocation,
        currentAllocation: formattedCurrentAllocation,
        allocationDifferences: formattedAllocationDifferences,
        estimatedAnnualDividend: estimatedAnnualDividend
    };
}

// Validate investment data
function validateInvestmentData(
    currentAllocation: CurrentAllocation, 
    targetAllocationPercentages: TargetAllocationPercentages, 
    totalInvestment: number
): boolean {
    if (typeof currentAllocation !== 'object' || 
        currentAllocation === null || 
        !Object.values(currentAllocation).every(v => typeof v === 'number')) {
        console.error("Invalid current_allocation format.");
        return false;
    }
    
    if (typeof targetAllocationPercentages !== 'object' || 
        targetAllocationPercentages === null || 
        !Object.values(targetAllocationPercentages).every(v => typeof v === 'number')) {
        console.error("Invalid target_allocation_percentages format.");
        return false;
    }
    
    if (typeof totalInvestment !== 'number' || totalInvestment <= 0) {
        console.error("Invalid total_investment format.");
        return false;
    }
    
    // Check if allocation keys match
    const currentKeys = Object.keys(currentAllocation).sort();
    const targetKeys = Object.keys(targetAllocationPercentages).sort();
    
    if (currentKeys.join(',') !== targetKeys.join(',')) {
        console.error("Allocation keys mismatch.");
        console.error(`Current keys: ${currentKeys.join(', ')}`);
        console.error(`Target keys: ${targetKeys.join(', ')}`);
        return false;
    }
    
    return true;
}

// Calculate target investment amounts
function calculateTargetInvestments(
    currentAllocation: CurrentAllocation, 
    targetAllocationPercentages: TargetAllocationPercentages, 
    totalInvestment: number
): TargetInvestments | null {
    if (!validateInvestmentData(currentAllocation, targetAllocationPercentages, totalInvestment)) {
        return null;
    }

    const newTotal = Object.values(currentAllocation).reduce((sum, val) => sum + val, 0) + totalInvestment;
    const targetInvestments: TargetInvestments = {};
    
    for (const pieType in targetAllocationPercentages) {
        const targetPercentage = targetAllocationPercentages[pieType] / 100;
        const targetValue = newTotal * targetPercentage;
        const currentValue = currentAllocation[pieType] || 0;
        
        // Calculate how much to invest in this pie
        targetInvestments[pieType] = Math.max(0, targetValue - currentValue);
    }
    
    return targetInvestments;
}

// Calculate current target investments
function calculateCurrentTargetInvestments(
    portfolioData: PerformanceMetrics, 
    totalInvestment: number
): TargetInvestments | null {
    try {
        if (!validatePortfolioData(portfolioData)) {
            return null;
        }
        
        const pies = extractPies(portfolioData.portfolio);
        const [currentAllocation, targetAllocationPercentages] = calculateCurrentAllocation(pies);

        if (!validateInvestmentData(currentAllocation, targetAllocationPercentages, totalInvestment)) {
            return null;
        }

        return calculateTargetInvestments(currentAllocation, targetAllocationPercentages, totalInvestment);
    } catch (error: any) {
        console.error(`Error calculating target investments: ${error.message}`);
        return null;
    }
}

// Main function to fetch portfolio data
export async function fetchPortfolioData(budget: number = 1000, cc: string = "BG"): Promise<PerformanceMetrics> {
    // Initialize default performance metrics
    const defaultPerformanceMetrics: PerformanceMetrics = {
        portfolio: null,
        overallSummary: null,
        allocationAnalysis: undefined,
        rebalanceInvestmentForTarget: null,
        freeCashAvailable: 0,
        fetchDate: format(new Date(), "yyyy-MM-dd HH:mm:ss")
    };
    
    // Fetch cash data
    const cashResponse = await exponentialBackoffRequest(cashURL, 'GET', headers, 5);
    if (!cashResponse) {
        console.error("Failed to fetch cash data.");
        return defaultPerformanceMetrics;
    }

    // Calculate free cash
    let totalFreeCash = 0;
    const cashData = cashResponse.data;
    
    if (Array.isArray(cashData)) {
        for (const cashEntry of cashData) {
            totalFreeCash += cashEntry.cash || 0;
        }
    } else if (cashData && typeof cashData === 'object') {
        totalFreeCash = cashData.free || 0;
    }
    
    defaultPerformanceMetrics.freeCashAvailable = totalFreeCash;
    
    // Fetch instruments metadata
    const allInstrumentsMetadata = await getAllInstrumentsMetadata();
    if (!allInstrumentsMetadata) {
        console.error("Failed to fetch instruments metadata.");
        return defaultPerformanceMetrics;
    }
    
    // Fetch all pies data
    const [allPiesData, overallSummary] = await getAllPiesData(allInstrumentsMetadata);
    
    // Initialize performance metrics
    const portfolioData: PerformanceMetrics = {
        ...defaultPerformanceMetrics,
        portfolio: allPiesData,
        overallSummary: overallSummary
    };
    
    // Update fetch date for all pies
    const dtString = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    if (allPiesData) {
        allPiesData.forEach(pie => {
            pie.fetchDate = dtString;
        });
    }
    
    if (overallSummary) {
        overallSummary.overallSummary.fetchDate = dtString;
    }

    // Calculate performance metrics and target investments if we have data
    if (portfolioData.portfolio && portfolioData.overallSummary) {
        const performanceMetrics = calculatePerformanceMetrics(portfolioData, budget);
        portfolioData.allocationAnalysis = performanceMetrics;

        const targetInvestments = calculateCurrentTargetInvestments(portfolioData, budget);
        portfolioData.rebalanceInvestmentForTarget = targetInvestments;
    }

    return portfolioData;
}
