import { UserSettings } from "~/db/schema";

interface PortfolioInstrument {
  currentShare: number;
  expectedShare: number;
  issues: string[];
  ownedQuantity: number;
  ticker: string;
  investedValue: number;
  currentValue: number;
  resultValue: number;
  fullName: string;
  addedToMarket: string;
  currencyCode: string;
  maxOpenQuantity: number;
  minTradeQuantity: number;
  type: "STOCK" | "ETF";
}

interface Portfolio {
  name: string;
  creationDate: number;
  dividendCashAction: string;
  instruments: PortfolioInstrument[];
  totalInvested: number;
  totalResult: number;
  returnPercentage: number;
  totalInvestedOverall: number;
  totalResultOverall: number;
  fetchDate: string;
}

interface OverallSummary {
  totalInvestedOverall: number;
  totalResultOverall: number;
  returnPercentageOverall: number;
  fetchDate: string;
}

interface DepositInfo {
  totalDepositedThisMonth: number;
  budgetMetThisMonth: string;
  expectedDepositDate: string;
  expectedDepositMessage: string;
  freeCashAvailable: number;
  totalCash: number;
}

interface AllocationAnalysis {
  targetAllocation: Record<string, string>;
  currentAllocation: Record<string, string>;
  allocationDifferences: Record<string, string>;
}

interface PlannedInvestment {
  [key: string]: number;
}

export interface PortfolioData {
  portfolio: Portfolio[];
  overallSummary: OverallSummary;
  deposit_info: DepositInfo;
  allocation_analysis: AllocationAnalysis;
  planned_investment_expected_deposit_date: PlannedInvestment;
}

export async function fetchPortfolioData(settings: UserSettings): Promise<PortfolioData> {
  try {
    // In a real app, this would make an actual API call
    // For this demo, we'll simulate the API response
    const response = await fetch(`http://127.0.0.1:8000/v1/portfolio?country=${settings.country}&currency=${settings.currency}&budget=${settings.monthlyBudget}`);
    
    // Since we're not actually making a real API call, we'll return mock data
    return getMockPortfolioData(settings);
  } catch (error) {
    console.error("Error fetching portfolio data:", error);
    return getMockPortfolioData(settings);
  }
}

function getMockPortfolioData(settings: UserSettings): PortfolioData {
  const currentDate = new Date();
  const fetchDateStr = currentDate.toISOString().split('T')[0] + ' ' + 
                       currentDate.toTimeString().split(' ')[0].substring(0, 8);
  
  const expectedDepositDate = new Date();
  expectedDepositDate.setDate(currentDate.getDate() + 7);
  const expectedDepositDateStr = expectedDepositDate.toISOString().split('T')[0] + ' 00:00:00';
  
  return {
    "portfolio": [
      {
        "name": "Next-Gen Growth",
        "creationDate": 1738773075.0,
        "dividendCashAction": "REINVEST",
        "instruments": [
          {
            "currentShare": 0.1107,
            "expectedShare": 0.13,
            "issues": [],
            "ownedQuantity": 0.4610409,
            "ticker": "NVDA_US_EQ",
            "investedValue": 111.98,
            "currentValue": 102.39,
            "resultValue": -9.59,
            "fullName": "Nvidia",
            "addedToMarket": "2018-07-12T07:10:17.000+03:00",
            "currencyCode": "USD",
            "maxOpenQuantity": 18911278.0,
            "minTradeQuantity": 0.01,
            "type": "STOCK"
          },
          {
            "currentShare": 0.0907,
            "expectedShare": 0.10,
            "issues": [],
            "ownedQuantity": 1.2610409,
            "ticker": "AAPL_US_EQ",
            "investedValue": 221.98,
            "currentValue": 215.39,
            "resultValue": -6.59,
            "fullName": "Apple Inc.",
            "addedToMarket": "2018-07-12T07:10:17.000+03:00",
            "currencyCode": "USD",
            "maxOpenQuantity": 18911278.0,
            "minTradeQuantity": 0.01,
            "type": "STOCK"
          },
          {
            "currentShare": 0.0807,
            "expectedShare": 0.07,
            "issues": [],
            "ownedQuantity": 2.4610409,
            "ticker": "MSFT_US_EQ",
            "investedValue": 645.02,
            "currentValue": 661.20,
            "resultValue": 16.18,
            "fullName": "Microsoft",
            "addedToMarket": "2018-07-12T07:10:17.000+03:00",
            "currencyCode": "USD",
            "maxOpenQuantity": 18911278.0,
            "minTradeQuantity": 0.01,
            "type": "STOCK"
          }
        ],
        "totalInvested": 978.98,
        "totalResult": -53.78,
        "returnPercentage": -5.49,
        "totalInvestedOverall": 1937.15,
        "totalResultOverall": -47.40,
        "fetchDate": fetchDateStr
      }
    ],
    "overallSummary": {
      "totalInvestedOverall": 1937.15,
      "totalResultOverall": -47.40,
      "returnPercentageOverall": -2.45,
      "fetchDate": fetchDateStr
    },
    "deposit_info": {
      "totalDepositedThisMonth": 1430.0,
      "budgetMetThisMonth": `Budget already invested, no available deposit. Monthly budget: ${settings.currency} ${settings.monthlyBudget}`,
      "expectedDepositDate": expectedDepositDateStr,
      "expectedDepositMessage": "Deposit expected in 7 days",
      "freeCashAvailable": 0.06,
      "totalCash": 2083.03
    },
    "allocation_analysis": {
      "targetAllocation": {
        "Next-Gen Growth": "40.00%",
        "REIT": "20.00%",
        "Defensive Growth": "40.00%"
      },
      "currentAllocation": {
        "Next-Gen Growth": `978.98 ${settings.currency} [50.54%]`,
        "REIT": `362.82 ${settings.currency} [18.73%]`,
        "Defensive Growth": `595.35 ${settings.currency} [30.73%]`
      },
      "allocationDifferences": {
        "Next-Gen Growth": "-10.54%",
        "REIT": "1.27%",
        "Defensive Growth": "9.27%"
      }
    },
    "planned_investment_expected_deposit_date": {
      "Next-Gen Growth": 195.88,
      "REIT": 224.61,
      "Defensive Growth": 579.51
    }
  };
}
