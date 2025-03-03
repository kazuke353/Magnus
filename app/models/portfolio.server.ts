// Sample portfolio data
export const portfolioData = {
  portfolio: [
    {
      overallSummary: {
        totalInvestedOverall: 1937.15,
        totalResultOverall: -45.35,
        returnPercentageOverall: -2.3410680639083195,
        fetchDate: "2025-03-01 17:12:57"
      }
    }
  ],
  deposit_info: {
    totalDepositedThisMonth: 1430.0,
    budgetMetThisMonth: "Budget already invested, no available deposit.",
    expectedDepositDate: "2025-03-10 00:00:00",
    expectedDepositMessage: "Deposit expected in 9 days",
    freeCashAvailable: 0.06
  },
  allocation_analysis: {
    targetAllocation: {
      "Next-Gen Growth": "40.00%",
      "REIT": "20.00%",
      "Defensive Growth": "40.00%"
    },
    currentAllocation: {
      "Next-Gen Growth": "978.98 BGN [50.54%]",
      "REIT": "362.82 BGN [18.73%]",
      "Defensive Growth": "595.35 BGN [30.73%]"
    },
    allocationDifferences: {
      "Next-Gen Growth": "-10.54%",
      "REIT": "1.27%",
      "Defensive Growth": "9.27%"
    }
  },
  planned_investment_expected_deposit_date: {
    "Next-Gen Growth": 195.87999999999988,
    "REIT": 224.60999999999996,
    "Defensive Growth": 579.51
  }
};

export function getPortfolioData() {
  return portfolioData;
}

export function getPortfolioSummary() {
  return portfolioData.portfolio[0].overallSummary;
}

export function getDepositInfo() {
  return portfolioData.deposit_info;
}

export function getAllocationAnalysis() {
  return portfolioData.allocation_analysis;
}

export function getPlannedInvestments() {
  return portfolioData.planned_investment_expected_deposit_date;
}
