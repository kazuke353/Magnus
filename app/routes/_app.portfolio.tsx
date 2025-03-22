import { useLoaderData, useSubmit, useNavigation, Link, json } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { getPortfolioData, savePortfolioData } from "~/services/portfolio.server";
import { PerformanceMetrics } from "~/utils/portfolio_fetcher";
import Card from "~/components/Card";
import SummaryCard from "~/components/SummaryCard";
import Button from "~/components/Button";
import PortfolioChart from "~/components/PortfolioChart";
import LoadingIndicator from "~/components/LoadingIndicator";
import Notification from "~/components/Notification";
import { FiRefreshCw, FiTrendingUp, FiTrendingDown, FiDollarSign, FiCalendar, FiMessageSquare, FiBarChart, FiList, FiPieChart } from "react-icons/fi";
import { formatDate, formatDateTime, formatCurrency, formatPercentage } from "~/utils/formatters";
import { useState, useEffect } from "react";
import { errorResponse, createApiError } from "~/utils/error-handler";

// Loader function to fetch user and initial portfolio data
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const user = await requireAuthentication(request, "/login");

    let portfolioData: PerformanceMetrics | null = null;

    try {
      // First try to get cached data
      const cachedData = await getPortfolioData(user.id);
      
      if (cachedData) {
        portfolioData = cachedData;
      } else {
        // If no cached data, fetch fresh data
        portfolioData = await getPortfolioData(user.settings.monthlyBudget, user.settings.country);
        
        if (portfolioData) {
          await savePortfolioData(user.id, portfolioData);
        }
      }
    } catch (loadError) {
      console.error("Error loading portfolio data in loader:", loadError);
      throw createApiError("Failed to load portfolio data", { originalError: loadError });
    }

    return json({ user, portfolioData });
  } catch (error) {
    return errorResponse(error);
  }
};

// Action function to handle refresh button
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const user = await requireAuthentication(request, "/login");

    const formData = await request.formData();
    const actionType = formData.get("_action");

    if (actionType === "refresh") {
      try {
        // Force fresh data fetch
        const portfolioData = await getPortfolioData(user.settings.monthlyBudget, user.settings.country);
        
        if (portfolioData) {
          await savePortfolioData(user.id, portfolioData);
          return json({ success: true, portfolioData, message: "Portfolio data refreshed successfully" });
        } else {
          throw createApiError("Failed to refresh portfolio data");
        }
      } catch (error) {
        console.error("Error refreshing portfolio data:", error);
        return json({ 
          success: false, 
          error: "Error refreshing portfolio data: " + (error instanceof Error ? error.message : "Unknown error") 
        }, { status: 500 });
      }
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
};

export default function Portfolio() {
  const loaderData = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submit = useSubmit();

  // Handle potential error in loader data
  const { user, portfolioData: initialPortfolioData, error } = loaderData.error 
    ? { user: null, portfolioData: null, error: loaderData.error } 
    : { ...loaderData, error: null };

  const [portfolioData, setPortfolioData] = useState<PerformanceMetrics | null>(initialPortfolioData);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  // Update portfolio data when loader data changes
  useEffect(() => {
    if (initialPortfolioData) {
      setPortfolioData(initialPortfolioData);
    }
  }, [initialPortfolioData]);

  // Show notification when there's an error
  useEffect(() => {
    if (error) {
      setNotification({
        type: "error",
        message: error.message || "An error occurred while loading portfolio data"
      });
    }
  }, [error]);

  const handleRefresh = () => {
    const formData = new FormData();
    formData.append("_action", "refresh");
    submit(formData, { method: "post" });
    
    // Show loading notification
    setNotification({
      type: "info",
      message: "Refreshing portfolio data..."
    });
  };

  const isRefreshing = navigation.state === "submitting" && 
    navigation.formData?.get("_action") === "refresh";

  // Handle successful refresh
  useEffect(() => {
    if (navigation.state === "idle" && navigation.formData?.get("_action") === "refresh") {
      const actionData = navigation.formData;
      
      if (actionData && "success" in actionData && actionData.success) {
        setNotification({
          type: "success",
          message: "Portfolio data refreshed successfully"
        });
      }
    }
  }, [navigation.state, navigation.formData]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <div className="text-center p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please log in to view your portfolio.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Login
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 md:px-8 lg:px-16 xl:px-24">
      {isRefreshing && <LoadingIndicator fullScreen message="Refreshing portfolio data..." />}
      
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Investment Portfolio
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Detailed view of your portfolio performance and holdings.
          </p>
        </div>

        <Button
          onClick={handleRefresh}
          isLoading={isRefreshing}
          className="px-4 py-2 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200"
          disabled={isRefreshing}
        >
          <FiRefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {!portfolioData && !isRefreshing && (
        <Card>
          <div className="text-center py-8">
            <FiBarChart className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Portfolio Data Available</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              We couldn't find any portfolio data for your account.
            </p>
            <Button onClick={handleRefresh}>
              <FiRefreshCw className="mr-2" />
              Refresh Data
            </Button>
          </div>
        </Card>
      )}

      {portfolioData && portfolioData.overallSummary && portfolioData.allocationAnalysis && portfolioData.portfolio && portfolioData.overallSummary.overallSummary && (
        <>
          {/* Overall Portfolio Summary Panel - Single Card */}
          <Card className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Invested */}
              <div className="p-4">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-800 mr-4">
                    <FiDollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">INVESTED</h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {formatCurrency(portfolioData.overallSummary.overallSummary?.totalInvestedOverall || 0, user.settings.currency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Return */}
              <div className="p-4">
                <div className="flex items-center">
                  <div className={`p-3 rounded-full ${portfolioData.overallSummary.overallSummary?.totalResultOverall >= 0 ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'} mr-4`}>
                    {portfolioData.overallSummary.overallSummary?.totalResultOverall >= 0 ? (
                      <FiTrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <FiTrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">RETURN</h3>
                    <p className={`text-xl font-bold ${portfolioData.overallSummary.overallSummary?.totalResultOverall >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} mt-1`}>
                      {formatCurrency(portfolioData.overallSummary.overallSummary?.totalResultOverall || 0, user.settings.currency, true)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Est. Annual Dividends */}
              <div className="p-4">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-teal-100 dark:bg-teal-800 mr-4">
                    <FiDollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">EST. ANNUAL DIVIDENDS</h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {formatCurrency(portfolioData.allocationAnalysis.estimatedAnnualDividend || 0, user.settings.currency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Last Updated */}
              <div className="p-4">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 mr-4">
                    <FiCalendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">LAST UPDATED</h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1" title={portfolioData.overallSummary.overallSummary.fetchDate}>
                      {formatDateTime(portfolioData.overallSummary.overallSummary.fetchDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Portfolio Allocation Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Portfolio Performance</h2>
              <div className="h-80">
                <PortfolioChart portfolioData={portfolioData} />
              </div>
            </Card>
            
            <Card className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Allocation Analysis</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Target Allocation</h3>
                  <div className="space-y-2">
                    {Object.entries(portfolioData.allocationAnalysis.targetAllocation).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300">{key}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Current Allocation</h3>
                  <div className="space-y-2">
                    {Object.entries(portfolioData.allocationAnalysis.currentAllocation).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300">{key}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Allocation Differences</h3>
                  <div className="space-y-2">
                    {Object.entries(portfolioData.allocationAnalysis.allocationDifferences).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300">{key}</span>
                        <span className={`font-medium ${
                          value.startsWith('-') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Portfolio Breakdown Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio Breakdown</h2>
            {portfolioData.portfolio.map((portfolio, index) => (
              <Card key={index} title={portfolio.name} className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Creation Date: {formatDate(portfolio.creationDate)}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Invested</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(portfolio.totalInvested, user.settings.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Result</p>
                      <p className={`text-lg font-semibold ${portfolio.totalResult >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(portfolio.totalResult, user.settings.currency, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Return Percentage</p>
                      <p className={`text-lg font-semibold ${portfolio.returnPercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatPercentage(portfolio.returnPercentage, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dividend Cash Action</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{portfolio.dividendCashAction}</p>
                    </div>
                  </div>

                  {/* Instruments Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-100 dark:bg-gray-900">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Instrument
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Ticker
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Invested
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Current Value
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Result
                          </th>
                           <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Div. Yield
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            1W Perf.
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            1M Perf.
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            3M Perf.
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            1Y Perf.
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {portfolio.instruments.map((instrument, instrumentIndex) => (
                          <tr key={instrumentIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {instrument.fullName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {instrument.ticker}
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
  {instrument.ticker}
</td>
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
  {instrument.type}
</td>
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
  {instrument.ownedQuantity.toFixed(2)}
</td>
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
  {formatCurrency(instrument.investedValue, user.settings.currency)}
</td>
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
  {formatCurrency(instrument.currentValue, user.settings.currency)}
</td>
<td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${instrument.resultValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
  {formatCurrency(instrument.resultValue, user.settings.currency, true)}
</td>
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
  {instrument.dividendYield ? `${instrument.dividendYield}%` : 'N/A'}
</td>
<td className={`px-4 py-3 whitespace-nowrap text-sm ${instrument.performance_1week >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
  {instrument.performance_1week ? formatPercentage(instrument.performance_1week) : 'N/A'}
</td>
<td className={`px-4 py-3 whitespace-nowrap text-sm ${instrument.performance_1month >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
  {instrument.performance_1month ? formatPercentage(instrument.performance_1month) : 'N/A'}
</td>
<td className={`px-4 py-3 whitespace-nowrap text-sm ${instrument.performance_3months >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
  {instrument.performance_3months ? formatPercentage(instrument.performance_3months) : 'N/A'}
</td>
<td className={`px-4 py-3 whitespace-nowrap text-sm ${instrument.performance_1year >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
  {instrument.performance_1year ? formatPercentage(instrument.performance_1year) : 'N/A'}
</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
</Card>
))}
</section>

{/* Chat assistant promo */}
<Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg rounded-xl p-6">
<div className="flex flex-col md:flex-row items-center justify-between">
<div className="mb-4 md:mb-0">
<h3 className="text-xl font-bold mb-2">Need help with your finances?</h3>
<p className="text-gray-100 text-lg">Chat with our AI assistant to get personalized advice and insights.</p>
</div>
<Link
to="/chat"
className="px-5 py-3 bg-white text-blue-600 rounded-md font-semibold hover:bg-blue-50 transition-colors shadow-md"
>
<FiMessageSquare className="inline-block mr-2" />
Start chatting
</Link>
</div>
</Card>
</>
)}
</div>
);
}
