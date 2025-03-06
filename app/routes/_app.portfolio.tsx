import { useLoaderData, useSubmit, useNavigation, Link, json, } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node"; // Use 'type' import
import { requireAuthentication } from "~/services/auth.server";
import { fetchPortfolioData, PortfolioData, getPortfolioData, savePortfolioData } from "~/services/portfolio.server"; // Keep these imports in loader/action
import Card from "~/components/Card";
import Button from "~/components/Button";
import PortfolioChart from "~/components/PortfolioChart";
import { FiRefreshCw, FiTrendingUp, FiTrendingDown, FiDollarSign, FiCalendar, FiLoader, FiMessageSquare } from "react-icons/fi"; // Import FiLoader for loading spinner
import { formatDate } from "~/utils/date";
import { useState, useEffect } from "react"; // Import useState and useEffect

// Loader function to fetch user and initial portfolio data
export const loader: LoaderFunctionArgs = async ({ request }) => { // Explicitly type LoaderFunctionArgs
  const user = await requireAuthentication(request, "/login");

  let portfolioData: PortfolioData | null = null; // Initialize portfolioData

  try {
    // Try to load from DB first
    const dbData = await getPortfolioData(user.id);
    //console.log("getPortfolioData result in loader:", dbData); // **LOG 1 in LOADER: Check DB result**

    if (!dbData) {
      console.log("No data in DB in loader, fetching from API..."); // **LOG 2 in LOADER: Check if fetching from API**
      portfolioData = await fetchPortfolioData(user.settings, user.id); // Fetch from API if not in DB
      if (portfolioData) {
        await savePortfolioData(user.id, portfolioData); // Save to DB
      }
    } else {
      portfolioData = dbData; // Use data from DB
    }
  } catch (loadError) {
    console.error("Error loading portfolio data in loader:", loadError);
    // Handle error if needed, maybe return an error object in json
  }


  return json({ user, portfolioData }); // Return fetched portfolioData
};


// Action function to handle refresh button (no changes needed from previous version)
export const action: ActionFunctionArgs = async ({ request }) => { // Explicitly type ActionFunctionArgs
  const user = await requireAuthentication(request, "/login");

  const formData = await request.formData();
  const actionType = formData.get("_action"); // Use a more descriptive name

  if (actionType === "refresh") {
    try {
      const portfolioData = await fetchPortfolioData(user.settings, user.id);
      if (portfolioData) {
         await savePortfolioData(user.id, portfolioData); // Save refreshed data to DB
         return json({ success: true, portfolioData }); // Optionally return fresh data to action for revalidation
      } else {
         return json({ success: false, error: "Failed to refresh portfolio data from API." }, { status: 500 }); // Indicate refresh failure
      }
    } catch (error) {
      console.error("Error refreshing portfolio data:", error);
      return json({ success: false, error: "Error refreshing portfolio data: " + (error as Error).message }, { status: 500 }); // Handle fetch errors
    }
  }

  return json({ error: "Invalid action" }, { status: 400 }); // For any other invalid action
};


export default function Portfolio() {
  const { user, portfolioData: initialPortfolioData, error } = useLoaderData<typeof loader>(); // Get error from loader
  const navigation = useNavigation();
  const submit = useSubmit();

  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(initialPortfolioData); // Initialize with data from loader
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false); // Loading state not needed initially as loader provides data

  useEffect(() => {
    setPortfolioData(initialPortfolioData); // Update state when initialPortfolioData from loader changes. This might be redundant, consider removing useState and using initialPortfolioData directly. Keeping it for now for potential future client-side updates.
  }, [initialPortfolioData]);


  const handleRefresh = () => {
    const formData = new FormData();
    formData.append("_action", "refresh");
    submit(formData, { method: "post" });
  };

  const isRefreshing = navigation.state === "submitting" && navigation.formData.get("_action") === "refresh"; // Check refresh action

  return (<div className="space-y-8 px-4 md:px-8 lg:px-16 xl:px-24"> {/* Increased space-y and added horizontal padding */}
    <div className="flex justify-between items-center mb-4"> {/* Added mb-4 for spacing */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100"> {/* Increased text size */}
          Portfolio Dashboard
          {isLoadingInitialData && <FiLoader className="inline-block ml-2 animate-spin text-gray-500 dark:text-gray-400" />}
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300"> {/* Slightly emphasized description */}
          View and manage your investment portfolio.
        </p>
      </div>

      <Button
        onClick={handleRefresh}
        isLoading={isRefreshing}
        disabled={isLoadingInitialData}
        className="px-4 py-2 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200" // Button styling
      >
        <FiRefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>

    {isLoadingInitialData && !error && (
      <p className="text-center text-gray-600 dark:text-gray-400">Loading portfolio data...</p>
    )}

    {error && !isLoadingInitialData && (
      <p className="text-red-600 text-center">{error}</p>
    )}

    {portfolioData && (
      <>
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"> {/* Increased gap */}
          <Card className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 shadow-md rounded-xl p-4"> {/* Shadow and rounded corners */}
            <div className="flex items-center">
              <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-800"> {/* Increased padding */}
                <FiDollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-5"> {/* Increased margin-left */}
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total Invested</h3> {/* More prominent heading */}
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1"> {/* Larger and bolder text */}
                  {user.settings.currency} {portfolioData.overallSummary.totalInvestedOverall.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className={`${portfolioData.overallSummary.totalResultOverall >= 0 ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'} dark:bg-opacity-20 shadow-md rounded-xl p-4`}> {/* Shadow and rounded corners */}
            <div className="flex items-center">
              <div className={`p-4 rounded-full ${portfolioData.overallSummary.totalResultOverall >= 0 ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'}`}> {/* Increased padding */}
                {portfolioData.overallSummary.totalResultOverall >= 0 ? (
                  <FiTrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <FiTrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="ml-5"> {/* Increased margin-left */}
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total Return</h3> {/* More prominent heading */}
                <p className={`text-xl font-bold ${portfolioData.overallSummary.totalResultOverall >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} mt-1`}> {/* Larger and bolder text */}
                  {portfolioData.overallSummary.totalResultOverall >= 0 ? '+' : ''}
                  {user.settings.currency} {portfolioData.overallSummary.totalResultOverall.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20 shadow-md rounded-xl p-4"> {/* Shadow and rounded corners */}
            <div className="flex items-center">
              <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-800"> {/* Increased padding */}
                <FiCalendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-5"> {/* Increased margin-left */}
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Next Deposit</h3> {/* More prominent heading */}
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1"> {/* Larger and bolder text */}
                  {formatDate(portfolioData.deposit_info.expectedDepositDate)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 shadow-md rounded-xl p-4"> {/* Shadow and rounded corners */}
            <div className="flex items-center">
              <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-800"> {/* Increased padding */}
                <FiDollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-5"> {/* Increased margin-left */}
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Cash Available</h3> {/* More prominent heading */}
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1"> {/* Larger and bolder text */}
                  {user.settings.currency} {portfolioData.deposit_info.freeCashAvailable.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="bg-teal-50 dark:bg-teal-900 dark:bg-opacity-20 shadow-md rounded-xl p-4"> {/* New card for dividends */}
            <div className="flex items-center">
                <div className="p-4 rounded-full bg-teal-100 dark:bg-teal-800">
                    <FiDollarSign className="h-6 w-6 text-teal-600 dark:text-teal-400" /> {/* Choose a relevant icon */}
                </div>
                <div className="ml-5">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Est. Annual Dividends</h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {user.settings.currency} {portfolioData.allocation_analysis.estimatedAnnualDividend.toFixed(2)} {/* Display calculated dividend */}
                    </p>
                </div>
            </div>
          </Card>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"> {/* Increased gap */}
          {/* Portfolio allocation chart */}
          <Card title="Portfolio Allocation" className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800"> {/* Shadow, rounded corners, background */}
            <PortfolioChart portfolioData={portfolioData} />
          </Card>

          {/* Portfolio details */}
          <Card title="Portfolio Details" className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6"> {/* Shadow, rounded corners, background, padding */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Performance</h3> {/* More prominent section heading */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Return Percentage</p> {/* Uppercase for label */}
                    <p className={`text-xl font-semibold ${portfolioData.overallSummary.returnPercentageOverall >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} mt-1`}> {/* Larger and bolder text */}
                      {portfolioData.overallSummary.returnPercentageOverall >= 0 ? '+' : ''}
                      {portfolioData.overallSummary.returnPercentageOverall.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Updated</p> {/* Uppercase for label */}
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-1"> {/* Larger and bolder text */}
                      {portfolioData.overallSummary.fetchDate}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700"> {/* Added border for separation */}
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Deposit Information</h3> {/* More prominent section heading */}
                <div className="space-y-3"> {/* Increased space-y */}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">Monthly Budget</span> {/* Uppercase for label */}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.settings.currency} {user.settings.monthlyBudget.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">Deposited This Month</span> {/* Uppercase for label */}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.settings.currency} {portfolioData.deposit_info.totalDepositedThisMonth.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total Cash</span> {/* Uppercase for label */}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.settings.currency} {portfolioData.deposit_info.totalCash.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
                    {portfolioData.deposit_info.budgetMetThisMonth}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Instruments tables within each Portfolio Card (Pie) */}
        {portfolioData.portfolio.map((portfolio, index) => (
          <Card key={index} title={portfolio.name} className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6"> {/* Card styling for pies */}
            <div className="space-y-4"> {/* Reduced space-y */}
              <div className="text-sm text-gray-600 dark:text-gray-400">Creation Date: {formatDate(portfolio.creationDate)}</div> {/* Reduced text size */}
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Invested: {user.settings.currency} {portfolio.totalInvested.toFixed(2)}</div> {/* Slightly larger text */}
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Result: <span className={`${portfolio.totalResult >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{portfolio.totalResult >= 0 ? '+' : ''}{user.settings.currency} {portfolio.totalResult.toFixed(2)}</span></div> {/* Colored result */}
              <div className="text-base text-gray-500 dark:text-gray-400">Return Percentage: <span className={`${portfolio.returnPercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{portfolio.returnPercentage.toFixed(2)}%</span></div> {/* Colored percentage */}

              {/* Instruments table WITHIN EACH PORTFOLIO CARD */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-100 dark:bg-gray-900"> {/* Slightly different header background */}
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"> {/* Styled header text */}
                        Instrument
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Invested
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Current Value
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {portfolio.instruments.map((instrument, instrumentIndex) => (
                      <tr key={instrumentIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700"> {/* Hover effect on rows */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {instrument.fullName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {instrument.ticker}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {instrument.ownedQuantity.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {user.settings.currency} {instrument.investedValue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {user.settings.currency} {instrument.currentValue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold
                          ${instrument.resultValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                          {instrument.resultValue >= 0 ? '+' : ''}
                          {user.settings.currency} {instrument.resultValue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        ))}
      </>
    )}

    {/* Chat assistant promo */}
    <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg rounded-xl p-6"> {/* Enhanced card styling */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold mb-2">Need help with your finances?</h3> {/* Bolder title */}
          <p className="text-gray-100 text-lg">Chat with our AI assistant to get personalized advice and insights.</p> {/* Slightly larger text */}
        </div>
        <Link
          to="/chat"
          className="px-5 py-3 bg-white text-blue-600 rounded-md font-semibold hover:bg-blue-50 transition-colors shadow-md" // Enhanced button styling
        >
          <FiMessageSquare className="inline-block mr-2" />
          Start chatting
        </Link>
      </div>
    </Card>
  </div>
  );
}