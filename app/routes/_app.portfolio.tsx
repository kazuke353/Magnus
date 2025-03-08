import { useLoaderData, useSubmit, useNavigation, Link, json, } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { requireAuthentication } from "~/services/auth.server";
import { fetchPortfolioData, getPortfolioData, savePortfolioData, PerformanceMetrics, PieData, PieInstrument } from "~/services/portfolio.server";
import Card from "~/components/Card";
import SummaryCard from "~/components/SummaryCard";
import Button from "~/components/Button";
import PortfolioChart from "~/components/PortfolioChart";
import { FiRefreshCw, FiTrendingUp, FiTrendingDown, FiDollarSign, FiCalendar, FiLoader, FiMessageSquare, FiBarChart, FiList } from "react-icons/fi";
import { formatDate, formatDateTime } from "~/utils/date";
import { useState, useEffect } from "react";

// Loader function to fetch user and initial portfolio data
export const loader: LoaderFunctionArgs = async ({ request }) => {
  const user = await requireAuthentication(request, "/login");

  let portfolioData: PerformanceMetrics | null = null;

  try {
    const dbData = await getPortfolioData(user.id);

    if (!dbData) {
      portfolioData = await fetchPortfolioData(user.settings, user.id);
      if (portfolioData) {
        await savePortfolioData(user.id, portfolioData);
      }
    } else {
      portfolioData = dbData;
    }
  } catch (loadError) {
    console.error("Error loading portfolio data in loader:", loadError);
  }

  return json({ user, portfolioData });
};


// Action function to handle refresh button
export const action: ActionFunctionArgs = async ({ request }) => {
  const user = await requireAuthentication(request, "/login");

  const formData = await request.formData();
  const actionType = formData.get("_action");

  if (actionType === "refresh") {
    try {
      const portfolioData = await fetchPortfolioData(user.settings, user.id);
      if (portfolioData) {
         await savePortfolioData(user.id, portfolioData);
         return json({ success: true, portfolioData });
      } else {
         return json({ success: false, error: "Failed to refresh portfolio data from API." }, { status: 500 });
      }
    } catch (error) {
      console.error("Error refreshing portfolio data:", error);
      return json({ success: false, error: "Error refreshing portfolio data: " + (error as Error).message }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};


export default function Portfolio() {
  const { user, portfolioData: initialPortfolioData, error } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [portfolioData, setPortfolioData] = useState<PerformanceMetrics | null>(initialPortfolioData);

  useEffect(() => {
    setPortfolioData(initialPortfolioData);
  }, [initialPortfolioData]);


  const handleRefresh = () => {
    const formData = new FormData();
    formData.append("_action", "refresh");
    submit(formData, { method: "post" });
  };

  const isRefreshing = navigation.state === "submitting" && navigation.formData.get("_action") === "refresh";

  return (
    <div className="space-y-8 px-4 md:px-8 lg:px-16 xl:px-24">
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
        >
          <FiRefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {error && (
        <p className="text-red-600 text-center">{error}</p>
      )}

      {portfolioData && portfolioData.overallSummary && portfolioData.allocationAnalysis && portfolioData.portfolio && portfolioData.overallSummary.overallSummary && (
        <>
          {/* Overall Portfolio Summary Panel - Single Card */}
          <Card className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"> {/* Grid layout inside */}
              {/* Invested */}
              <div className="p-4">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-800 mr-4">
                    <FiDollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">INVESTED</h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {user.settings.currency} {portfolioData.overallSummary.overallSummary?.totalInvestedOverall?.toFixed(2)}
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
                      {portfolioData.overallSummary.overallSummary?.totalResultOverall >= 0 ? '+' : ''}
                      {user.settings.currency} {portfolioData.overallSummary.overallSummary?.totalResultOverall?.toFixed(2)}
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
                      {user.settings.currency} {portfolioData.allocationAnalysis.estimatedAnnualDividend?.toFixed(2)}
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
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{user.settings.currency} {portfolio.totalInvested.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Result</p>
                      <p className={`text-lg font-semibold ${portfolio.totalResult >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {portfolio.totalResult >= 0 ? '+' : ''}{user.settings.currency} {portfolio.totalResult.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Return Percentage</p>
                      <p className={`text-lg font-semibold ${portfolio.returnPercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {portfolio.returnPercentage >= 0 ? '+' : ''}{portfolio.returnPercentage.toFixed(2)}%
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
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {instrument.type}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {instrument.ownedQuantity.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {user.settings.currency} {instrument.investedValue.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {user.settings.currency} {instrument.currentValue.toFixed(2)}
                            </td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${instrument.resultValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {instrument.resultValue >= 0 ? '+' : ''}{user.settings.currency} {instrument.resultValue.toFixed(2)}
                            </td>
                             <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {instrument.dividendYield ? `${instrument.dividendYield}%` : 'N/A'}
                            </td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm text-${instrument.performance_1week >= 0 ? 'green-600 dark:green-400' : 'red-600 dark:red-400'}`}>
                              {instrument.performance_1week ? `${instrument.performance_1week.toFixed(2)}%` : 'N/A'}
                            </td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm text-${instrument.performance_1month >= 0 ? 'green-600 dark:green-400' : 'red-600 dark:red-400'}`}>
                              {instrument.performance_1month ? `${instrument.performance_1month.toFixed(2)}%` : 'N/A'}
                            </td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm text-${instrument.performance_3months >= 0 ? 'green-600 dark:green-400' : 'red-600 dark:red-400'}`}>
                              {instrument.performance_3months ? `${instrument.performance_3months.toFixed(2)}%` : 'N/A'}
                            </td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm text-${instrument.performance_1year >= 0 ? 'green-600 dark:green-400' : 'red-600 dark:red-400'}`}>
                              {instrument.performance_1year ? `${instrument.performance_1year.toFixed(2)}%` : 'N/A'}
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
            <div className="flex items-center justify-between">
              <div>
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