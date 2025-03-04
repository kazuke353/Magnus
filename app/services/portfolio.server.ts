import { UserSettings } from "~/db/schema";
import { getDb } from '~/db/database.server';
import { v4 as uuidv4 } from 'uuid';


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

export async function fetchPortfolioData(settings: UserSettings, userId: string): Promise<PortfolioData> {
  try {
    const response = await fetch(`http://127.0.0.1:8000/v1/portfolio?country=${settings.country}&currency=${settings.currency}&budget=${settings.monthlyBudget}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const portfolioData = data as PortfolioData;

    await savePortfolioData(userId, portfolioData); // **Save portfolio data to database**

    return portfolioData;
  } catch (error) {
    console.error("Error fetching portfolio data:", error);
    throw error;
  }
}

// Function to save portfolio data for a user
export async function savePortfolioData(userId: string, portfolioData: PortfolioData): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const portfolioId = uuidv4(); // Generate a unique ID for the portfolio record

  try {
    await db.run(
      `INSERT OR REPLACE INTO user_portfolios (id, userId, portfolioData, fetchDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        portfolioId,
        userId,
        JSON.stringify(portfolioData), // Serialize PortfolioData to JSON string
        now,
        now,
        now
      ]
    );
  } catch (error) {
    console.error("Error saving portfolio data to database:", error);
    throw error;
  }
}


// Function to get portfolio data for a user
export async function getPortfolioData(userId: string): Promise<PortfolioData | null> {
  const db = await getDb();

  try {
    const result = await db.get(
      'SELECT portfolioData FROM user_portfolios WHERE userId = ?',
      userId
    );

    if (result && result.portfolioData) {
      return JSON.parse(result.portfolioData) as PortfolioData; // Deserialize JSON string to PortfolioData
    } else {
      console.error("No portfolio data found for this user.");
      return null; // No portfolio data found for this user
    }
  } catch (error) {
    console.error("Error fetching portfolio data from database:", error);
    return null; // Handle error gracefully, return null
  }
}