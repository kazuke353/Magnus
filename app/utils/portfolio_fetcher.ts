import yahooFinance from 'yahoo-finance2';
import { format, subDays, subMonths, subYears } from 'date-fns';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const api_key = process.env.API_KEY;

const headers = { "Authorization": api_key, "Accept": "application/json" };

// API endpoints
const piesListURL = "https://live.trading212.com/api/v0/equity/pies";
const instrumentsMetadataURL = "https://live.trading212.com/api/v0/equity/metadata/instruments";
const cashURL = "https://live.trading212.com/api/v0/equity/account/cash";

// In-memory cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes

export interface InstrumentMetadata {
    ticker: string;
    name: string;
    currencyCode: string;
    type: string;
    addedOn: string;
    maxOpenQuantity: number;
    minTradeQuantity: number;
}

export interface PieInstrument extends Record<string, any> { // Allow extra properties
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
    minTradeQuantity?: string; // Corrected type to string to match python None return case
    type?: string;
    dividendYield: number;
    performance_1week?: number | null;
    performance_1month?: number | null;
    performance_3months?: number | null;
    performance_1year?: number | null;
}

export interface PieData extends Record<string, any> { // Allow extra properties
    name: string;
    creationDate: string;
    dividendCashAction: string;
    instruments: PieInstrument;
    totalInvested: number;
    totalResult: number;
    returnPercentage: number;
    fetchDate?: string;
}

export interface PerformanceMetrics extends Record<string, any> { // Allow extra properties
    totalInvestedOverall: number;
    totalResultOverall: number;
    freeCashAvailable: number;
    returnPercentageOverall: number;
    fetchDate?: string;
    allocationAnalysis?: AllocationAnalysis; // Type for allocationAnalysis
    rebalanceInvestmentForTarget?: TargetInvestments | null; // Type for planned_investment_expected_deposit_date
    portfolio?: PieData| null; // Add portfolio to PerformanceMetrics
    overallSummary?: OverallSummary | null; // Add overallSummary to PerformanceMetrics
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


async function exponentialBackoffRequest(url: string, method: 'GET' | 'POST' = 'GET', headers: Record<string, string>, delay: number = 5, retries: number = 3): Promise<any | null> {
    const cacheKey = url;
    const cachedResponse = apiCache.get(cacheKey);

    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_EXPIRATION_TIME) {
        return cachedResponse.data;
    }

    let attempts = 0;
    while (attempts <= retries) {
        try {
            const response = await axios({
                method: method,
                url: url,
                headers: headers
            });
            if (response.status >= 200 && response.status < 300) {
                apiCache.set(cacheKey, { data: response, timestamp: Date.now() });
                console.log(`Request for ${url} successful.`)
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

async function getAllInstrumentsMetadata(): Promise<Record<string, InstrumentMetadata> | null> {
    const response = await exponentialBackoffRequest(instrumentsMetadataURL, 'GET', headers, 5);
    if (response === null) {
        console.log("Failed to fetch instruments metadata.");
        return null;
    }
    try {
        const instruments = response.data as InstrumentMetadata;
        const metadataByTicker: Record<string, InstrumentMetadata> = {};
        instruments.forEach(instrument => {
            metadataByTicker[instrument.ticker] = instrument;
        });
        return metadataByTicker;
    } catch (e: any) {
        console.error(`Error parsing instruments metadata: ${e}`);
        try {
            console.error(`Response Content: ${JSON.stringify(response.data)}`);
        } catch (e) {
            console.error("No response available");
        }
        return null;
    }
}

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
        formatted = formatted.slice(0, -3);
        formatted += '.L';
    }

    //Add more specific ticker formating here.
    if(ticker === 'BRK_B_US_EQ'){
        formatted = 'BRK-B';
    }
    if(ticker === 'ALVd_EQ'){
        formatted = 'ALV.DE';
    }
    if(ticker === 'ABNa_EQ'){
        formatted = 'ABN.AS';
    }

    return formatted;
}

async function fetchPieDetails(pieId: string, allInstrumentsMetadata: Record<string, InstrumentMetadata>): Promise<PieData | null> {
    const pieDetailsURL = `${piesListURL}/${pieId}`;
    const response = await exponentialBackoffRequest(pieDetailsURL, 'GET', headers, 5);
    if (response === null) {
        console.log(`Could not fetch details for pie ID ${pieId}`);
        return null;
    }

    try {
        const pieDetails = response.data;
        const settings = pieDetails.settings || {};
        const pieData: PieData = {
            name: settings.name,
            creationDate: settings.creationDate,
            dividendCashAction: settings.dividendCashAction,
            instruments: [],
            totalInvested: 0,
            totalResult: 0,
            returnPercentage: 0
        };

        const instruments = pieDetails.instruments || [];
        for (const instrument of instruments) {
            const result = instrument.result || {};
            const instrumentData: PieInstrument = {
                currentShare: instrument.currentShare,
                expectedShare: instrument.expectedShare,
                issues: instrument.issues,
                ownedQuantity: instrument.ownedQuantity,
                ticker: instrument.ticker,
                investedValue: result.priceAvgInvestedValue || 0,
                currentValue: result.priceAvgValue || 0,
                resultValue: (result.priceAvgValue || 0) - (result.priceAvgInvestedValue || 0),
                dividendYield: 0
            };

            const ticker = instrument.ticker;
            const fullInstrumentData = allInstrumentsMetadata[ticker];
            if (fullInstrumentData) {
                instrumentData.fullName = fullInstrumentData.name;
                instrumentData.addedToMarket = fullInstrumentData.addedOn;
                instrumentData.currencyCode = fullInstrumentData.currencyCode;
                instrumentData.maxOpenQuantity = fullInstrumentData.maxOpenQuantity;
                instrumentData.minTradeQuantity = fullInstrumentData.minTradeQuantity as string; // Corrected type assertion
                instrumentData.type = fullInstrumentData.type;
            }

            const formattedTicker = await formatYahooTicker(ticker);
            try {
                const yfQuote = await yahooFinance.quote(`${formattedTicker}`); // Fetch quote first
                instrumentData.dividendYield = yfQuote?.dividendYield?.toFixed(2) || 0.0;

                const now = new Date();
                const pastYear = subYears(now, 1);
                const queryOptions = { period1: pastYear, interval: '1d' };
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
                    instrumentData.performance_1week = null;
                    instrumentData.performance_1month = null;
                    instrumentData.performance_3months = null;
                    instrumentData.performance_1year = null;
                    console.warn(`No historical data fetched for ${formattedTicker}`); // Warn if no historical data
                }

            } catch (e: any) {
                console.error(`Error fetching data for ${ticker} (Formatted: ${formattedTicker}) from Yahoo Finance: ${e}`);
                instrumentData.dividendYield = 0.0;
                instrumentData.performance_1week = null;
                instrumentData.performance_1month = null;
                instrumentData.performance_3months = null;
                instrumentData.performance_1year = null;
            }

            pieData.instruments.push(instrumentData);
        }

        pieData.totalInvested = pieData.instruments.reduce((sum, instr) => sum + instr.investedValue, 0);
        pieData.totalResult = pieData.instruments.reduce((sum, instr) => sum + instr.resultValue, 0);
        pieData.returnPercentage = pieData.totalInvested !== 0 ? (pieData.totalResult / pieData.totalInvested) * 100 : 0;
        pieData.fetchDate = format(new Date(), "yyyy-MM-dd HH:mm:ss");

        return pieData;

    } catch (e: any) {
        console.error(`Error processing pie details for pie ID ${pieId}: ${e}`);
        try {
            console.error(`Response Content: ${JSON.stringify(response.data)}`);
        } catch (e) {
            console.error("No response available");
        }
        return null;
    }
}

async function getAllPiesData(allInstrumentsMetadata: Record<string, InstrumentMetadata>, delayBetweenPies: number = 1): Promise<[PieData, OverallSummary] | [null, null]> {
    const response = await exponentialBackoffRequest(piesListURL, 'GET', headers, 5);
    if (response === null) {
        console.log("Failed to fetch list of pies.");
        return [null, null];
    }

    try {
        const piesList = response.data as any;
        const allPies: PieData= [];
        let totalInvestedOverall = 0;
        let totalResultOverall = 0;

        for (const pie of piesList) {
            const pieId = pie.id;
            const pieData = await fetchPieDetails(pieId, allInstrumentsMetadata);
            if (pieData) {
                allPies.push(pieData);
                totalInvestedOverall += pieData.totalInvested || 0;
                totalResultOverall += pieData.totalResult || 0;
            }
            await new Promise(resolve => setTimeout(resolve, delayBetweenPies * 1000));
        }

        const returnPercentageOverall = totalInvestedOverall !== 0 ? (totalResultOverall / totalInvestedOverall) * 100 : 0;
        const fetchDate = format(new Date(), "yyyy-MM-dd HH:mm:ss");

        const overallSummary: OverallSummary = {
            overallSummary: {
                totalInvestedOverall: totalInvestedOverall,
                totalResultOverall: totalResultOverall,
                returnPercentageOverall: returnPercentageOverall,
                fetchDate: fetchDate
            }
        };

        return [allPies, overallSummary];

    } catch (e: any) {
        console.error(`Error parsing list of pies: ${e}`);
        try {
            console.error(`Response Content: ${JSON.stringify(response.data)}`);
        } catch (e) {
            console.error("No response available");
        }
        return [null, null];
    }
}

function validate_portfolio_data(portfolio_data: any): void {
    /**Validates portfolio data format.*/
    if (typeof portfolio_data !== 'object' || portfolio_data === null || !('portfolio' in portfolio_data)) {
        throw new Error("Invalid portfolio data format.");
    }
}

function extract_overall_summary(portfolio_data: any): OverallSummary {
    /**Extracts overall summary.*/
    const overall_summary = portfolio_data.overallSummary as OverallSummary | undefined;
    if (!overall_summary) {
        throw new Error("No overall summary found");
    }
    return overall_summary;
}

function extract_pies(portfolio: PieData): PieData{
    /**Extracts pies (excluding overallSummary).*/
    return portfolio.filter(pie => pie.name !== "OverallSummary"); // Assuming "overallSummary" was meant to be pie.name === "OverallSummary" based on context. If it's really about excluding a key named "overallSummary" in pie object, the condition should be adjusted.
}

function calculate_basic_performance_metrics(overall_summary: OverallSummary): Record<string, number> {
    /**Calculates basic performance metrics.*/
    const os = overall_summary.overallSummary;
    return {
        totalInvested: os.totalInvestedOverall,
        totalResult: os.totalResultOverall,
        returnPercentage: os.returnPercentageOverall,
    };
}

function calculate_estimated_annual_dividend(portfolio_data: PerformanceMetrics, budget: number): number {
    /**Calculates estimated annual dividend with budget impact.*/
    let total_annual_dividend = 0;
    const annual_budget = budget * 12;

    if (portfolio_data && portfolio_data.portfolio) {
        let total_portfolio_value = 0;
        for (const pie of portfolio_data.portfolio) {
            if (pie.instruments) {
                for (const instrument of pie.instruments) {
                    total_portfolio_value += instrument.currentValue || 0.0;
                }
            }
        }

        for (const pie of portfolio_data.portfolio) {
            if (pie.instruments) {
                for (const instrument of pie.instruments) {
                    const dividend_yield = instrument.dividendYield || 0.0;
                    const current_value = instrument.currentValue || 0.0;
                    const annual_dividend_instrument = (current_value * dividend_yield) / 100.0;
                    total_annual_dividend += annual_dividend_instrument;

                    const allocation_ratio = total_portfolio_value ? current_value / total_portfolio_value : 0;
                    const budget_allocation = annual_budget * allocation_ratio;
                    const annual_dividend_from_budget = (budget_allocation * dividend_yield) / 100.0;
                    total_annual_dividend += annual_dividend_from_budget;
                }
            }
        }
    }

    return total_annual_dividend;
}

function extract_target_allocation_from_name(pie_name: string): [string | null, number | null] {
    /**Extracts pie type and target allocation from pie name.*/
    const parts = pie_name.split(" (");
    if (parts.length !== 2) {
        return [null, null];
    }
    try {
        const pie_type = parts[0].trim();
        const target_allocation = parseFloat(parts[1].trim().slice(0, -1)); // Remove ')' and parse
        return [pie_type, target_allocation];
    } catch (ValueError) {
        return [null, null];
    }
}

function calculate_current_allocation(pies: PieData): [CurrentAllocation, TargetAllocationPercentages] {
    /**Calculates current and target allocation.*/
    const current_allocation: CurrentAllocation = {};
    const target_allocation_percentages: TargetAllocationPercentages = {};
    for (const pie of pies) {
        const [pie_type, target_allocation] = extract_target_allocation_from_name(pie.name);
        if (pie_type && target_allocation) {
            current_allocation[pie_type] = (current_allocation[pie_type] || 0) + pie.totalInvested;
            target_allocation_percentages[pie_type] = target_allocation;
        }
    }
    return [current_allocation, target_allocation_percentages];
}

function calculate_percent_allocation(current_allocation: CurrentAllocation): PercentAllocation {
    /**Calculates percentage allocation.*/
    const total_current_allocation = Object.values(current_allocation).reduce((sum, val) => sum + val, 0);
    const percent_allocation: PercentAllocation = {};
    for (const pie_type in current_allocation) {
        percent_allocation[pie_type] = total_current_allocation ? current_allocation[pie_type] / total_current_allocation : 0;
    }
    return percent_allocation;
}

function format_allocation(allocation: CurrentAllocation | TargetAllocationPercentages, percent_allocation?: PercentAllocation, is_target: boolean = false): FormattedAllocation {
    /**Formats allocation for display.*/
    const formatted_allocation: FormattedAllocation = {};
    for (const key in allocation) {
        const value = allocation[key];
        if (is_target) {
            formatted_allocation[key] = `${(value as number / 100).toFixed(2)}%`; // Assuming target allocation is percentage already and needs formatting
        } else if (!percent_allocation) {
            formatted_allocation[key] = `${(value as number).toFixed(2)} BGN`;
        } else {
            formatted_allocation[key] = `${(value as number).toFixed(2)} BGN [${percent_allocation[key].toFixed(2)}%]`;
        }
    }
    return formatted_allocation;
}

function calculate_allocation_differences(percent_allocation: PercentAllocation, target_allocation: TargetAllocationPercentages): AllocationDifferences {
    /**Calculates allocation differences.*/
    const allocation_differences: AllocationDifferences = {};
    for (const pie_type in target_allocation) {
        const target = target_allocation[pie_type];
        const current = percent_allocation[pie_type] || 0; // Default to 0 if pie_type not in percent_allocation
        allocation_differences[pie_type] = `${(target - current).toFixed(2)}%`;
    }
    return allocation_differences;
}

function calculate_performance_metrics(portfolio_data: PerformanceMetrics, budget: number): AllocationAnalysis {
    /**Calculates portfolio performance metrics and allocation analysis.*/
    validate_portfolio_data(portfolio_data);
    const overall_summary = extract_overall_summary(portfolio_data);
    const pies = extract_pies(portfolio_data.portfolio || []);

    const [current_allocation, target_allocation_percentages] = calculate_current_allocation(pies);
    const percent_allocation = calculate_percent_allocation(current_allocation);

    const formatted_current_allocation = format_allocation(current_allocation, percent_allocation);
    const formatted_target_allocation = format_allocation(target_allocation_percentages, undefined, true); // percent_allocation not needed for target, is_target=true
    const formatted_allocation_differences = calculate_allocation_differences(percent_allocation, target_allocation_percentages);
    const estimated_annual_dividend = calculate_estimated_annual_dividend(portfolio_data, budget);

    return {
        targetAllocation: formatted_target_allocation,
        currentAllocation: formatted_current_allocation,
        allocationDifferences: formatted_allocation_differences,
        estimatedAnnualDividend: estimated_annual_dividend
    };
}

function validate_investment_data(current_allocation: CurrentAllocation, target_allocation_percentages: TargetAllocationPercentages, total_investment: number): boolean {
    /**Validates investment data.*/
    if (typeof current_allocation !== 'object' || current_allocation === null || !Object.values(current_allocation).every(v => typeof v === 'number')) {
        console.log("Error: Invalid current_allocation format.");
        return false;
    }
    if (typeof target_allocation_percentages !== 'object' || target_allocation_percentages === null || !Object.values(target_allocation_percentages).every(v => typeof v === 'number')) {
        console.log("Error: Invalid target_allocation_percentages format.");
        return false;
    }
    if (typeof total_investment !== 'number' || total_investment <= 0) {
        console.log("Error: Invalid total_investment format.");
        return false;
    }
    if (Object.keys(current_allocation).sort().toString() !== Object.keys(target_allocation_percentages).sort().toString()) {
        console.log("Error: Allocation keys mismatch.");
        return false;
    }
    return true;
}

function calculate_target_investments(current_allocation: CurrentAllocation, target_allocation_percentages: TargetAllocationPercentages, total_investment: number): TargetInvestments | null {
    /**Calculates target investment amounts.*/
    if (!validate_investment_data(current_allocation, target_allocation_percentages, total_investment)) {
        return null;
    }

    const new_total = Object.values(current_allocation).reduce((sum, val) => sum + val, 0) + total_investment;
    const target_investments: TargetInvestments = {};
    for (const pie_type in target_allocation_percentages) {
        const target_percentage = target_allocation_percentages[pie_type] / 100; // target_percentage was in percentage, convert to ratio
        target_investments[pie_type] = Math.max(0, new_total * target_percentage - (current_allocation[pie_type] || 0));
    }
    return target_investments;
}

function calculate_current_target_investments(portfolio_data: PerformanceMetrics, total_investment: number): TargetInvestments | null {
    /**Calculates current target investments.*/
    try {
        validate_portfolio_data(portfolio_data);
        const pies = extract_pies(portfolio_data.portfolio || []);
        const [current_allocation, target_allocation_percentages] = calculate_current_allocation(pies);

        if (!validate_investment_data(current_allocation, target_allocation_percentages, total_investment)) {
            return null;
        }

        return calculate_target_investments(current_allocation, target_allocation_percentages, total_investment);

    } catch (ve: any) {
        console.error(`ValueError: ${ve.message}`); // ve is already caught as any, message is safe to access
        return null;
    }
}

export async function fetchPortfolioData(budget: number = 1000, cc: string = "BG"): Promise<PerformanceMetrics> {
    let all_pies_data: PieData| null = null;
    let overall_summary: OverallSummary | null = null;
    let performanceMetrics: AllocationAnalysis | null = null; // Define performanceMetrics here
    let targetInvestments: TargetInvestments | null = null; // Define targetInvestments here

    const cashResponse = await exponentialBackoffRequest(cashURL, 'GET', headers, 5);
    if (cashResponse === null) {
        console.log("Failed to fetch cash data.");
        return [null, null];
    }

    const allInstrumentsMetadata = await getAllInstrumentsMetadata();
    if (allInstrumentsMetadata) {
        [all_pies_data, overall_summary] = await getAllPiesData(allInstrumentsMetadata);
        if (all_pies_data && overall_summary) {
            const now = new Date();
            const dt_string = format(now, "yyyy-MM-dd HH:mm:ss");
            if (all_pies_data) {
                all_pies_data.forEach(pie => {
                    pie['fetchDate'] = dt_string;
                });
            }
            overall_summary.overallSummary.fetchDate = dt_string; // Assuming fetchDate should be under overallSummary.overallSummary
        }
    }

    const cashData = cashResponse.data as any; // Cast to anyas the response is an array
    let totalFreeCash = 0;
    if (Array.isArray(cashData)) {
        for (const cashEntry of cashData) {
            totalFreeCash += cashEntry.cash || 0; // Sum up cash from each entry, default to 0 if cash is missing
        }
    } else {
        totalFreeCash += cashData.free;
    }

    const portfolio_data: PerformanceMetrics = { // Ensure portfolio_data is of type PerformanceMetrics
        portfolio: all_pies_data,
        overallSummary: overall_summary,
        allocationAnalysis:  {} as AllocationAnalysis, // Initialize as empty object to avoid potential undefined errors
        rebalanceInvestmentForTarget: null,
        freeCashAvailable: totalFreeCash,
        fetchDate: format(new Date(), "yyyy-MM-dd HH:mm:ss")
    } as PerformanceMetrics; // Type assertion to ensure the structure


    if (portfolio_data.portfolio && portfolio_data.overallSummary) { // Check if portfolio and overallSummary are not null/undefined
        performanceMetrics = calculate_performance_metrics(portfolio_data, budget);
        portfolio_data.allocationAnalysis = performanceMetrics;

        targetInvestments = calculate_current_target_investments(portfolio_data, budget);
        portfolio_data.rebalanceInvestmentForTarget = targetInvestments;
    }


    return portfolio_data;
}
