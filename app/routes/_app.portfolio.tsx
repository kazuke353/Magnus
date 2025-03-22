import { useLoaderData, useSubmit, useNavigation, Link, json } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useCallback, useMemo, useState, useEffect } from "react";
import { requireAuthentication } from "~/services/auth.server";
import { getPortfolioData, savePortfolioData } from "~/services/portfolio.server";
import { PerformanceMetrics } from "~/utils/portfolio_fetcher";
import Card from "~/components/Card";
import SummaryCard from "~/components/SummaryCard";
import Button from "~/components/Button";
import PortfolioChart from "~/components/PortfolioChart";
import LoadingIndicator from "~/components/LoadingIndicator";
import PortfolioSkeleton from "~/components/PortfolioSkeleton";
import SortableTable from "~/components/SortableTable";
import { showToast } from "~/components/ToastContainer";
import ImportExportModal from "~/components/ImportExportModal";
import { FiRefreshCw, FiTrendingUp, FiTrendingDown, FiDollarSign, FiCalendar, FiMessageSquare, FiBarChart, FiList, FiPieChart, FiUpload, FiDownload } from "react-icons/fi";
import { formatDate, formatDateTime, formatCurrency, formatPercentage } from "~/utils/formatters";
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
    } else if (actionType === "import") {
      try {
        const pieDataJson = formData.get("pieData") as string;
        if (!pieDataJson) {
          throw new Error("No pie data provided");
        }

        const pieData = JSON.parse(pieDataJson);
        
        // Here you would process the imported pie data and save it
        // This is a simplified example - in a real implementation, you would:
        // 1. Validate the imported data
        // 2. Transform it to match your portfolio data structure
        // 3. Merge it with existing portfolio data or create a new portfolio
        // 4. Save the updated portfolio data

        // For now, we'll just return success
        return json({ 
          success: true, 
          message: `Successfully imported ${pieData.name} pie with ${pieData.instruments.length} instruments` 
        });
      } catch (error) {
        console.error("Error importing pie data:", error);
        return json({
          success: false,
          error: "Error importing pie data: " + (error instanceof Error ? error.message : "Unknown error")
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
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);

  // Update portfolio data when loader data changes
  useEffect(() => {
    if (initialPortfolioData) {
      setPortfolioData(initialPortfolioData);
    }
  }, [initialPortfolioData]);

  // Show notification when there's an error
  useEffect(() => {
    if (error) {
      showToast({
        type: "error",
        message: error.message || "An error occurred while loading portfolio data",
        duration: 5000
      });
    }
  }, [error]);

  const handleRefresh = useCallback(() => {
    const formData = new FormData();
    formData.append("_action", "refresh");
    submit(formData, { method: "post" });

    // Show loading notification
    showToast({
      type: "info",
      message: "Refreshing portfolio data...",
      duration: 3000
    });
  }, [submit]);

  const handleImportPie = useCallback((pieData: any) => {
    const formData = new FormData();
    formData.append("_action", "import");
    formData.append("pieData", JSON.stringify(pieData));
    submit(formData, { method: "post" });

    // Show loading notification
    showToast({
      type: "info",
      message: "Importing pie data...",
      duration: 3000
    });
  }, [submit]);

  const isRefreshing = navigation.state === "submitting" &&
    navigation.formData?.get("_action") === "refresh";

  const isImporting = navigation.state === "submitting" &&
    navigation.formData?.get("_action") === "import";

  const isLoading = navigation.state === "loading";

  // Handle successful refresh
  useEffect(() => {
    if (navigation.state === "idle" && navigation.formData?.get("_action") === "refresh") {
      const actionData = navigation.formData;

      if (actionData && "success" in actionData && actionData.success) {
        showToast({
          type: "success",
          message: "Portfolio data refreshed successfully",
          duration: 5000
        });
      }
    }
  }, [navigation.state, navigation.formData]);

  // Handle successful import
  useEffect(() => {
    if (navigation.state === "idle" && navigation.formData?.get("_action") === "import") {
      const actionData = navigation.formData;

      if (actionData && "success" in actionData && actionData.success) {
        showToast({
          type: "success",
          message: actionData.message || "Pie data imported successfully",
          duration: 5000
        });
        setIsImportExportModalOpen(false);
      } else if (actionData && "error" in actionData) {
        showToast({
          type: "error",
          message: actionData.error || "Failed to import pie data",
          duration: 5000
        });
      }
    }
  }, [navigation.state, navigation.formData]);

  // Memoize the portfolio summary data
  const portfolioSummary = useMemo(() => {
    if (!portfolioData || !portfolioData.overallSummary || !portfolioData.overallSummary.overallSummary) {
      return null;
    }

    return {
      totalInvested: portfolioData.overallSummary.overallSummary.totalInvestedOverall || 0,
      totalResult: portfolioData.overallSummary.overallSummary.totalResultOverall || 0,
      returnPercentage: portfolioData.overallSummary.overallSummary.returnPercentageOverall || 0,
      fetchDate: portfolioData.overallSummary.overallSummary.fetchDate || new Date().toISOString(),
      estimatedAnnualDividend: portfolioData.allocationAnalysis?.estimatedAnnualDividend || 0
    };
  }, [portfolioData]);

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

  // Show skeleton loader during initial data fetch
  if (isLoading && !portfolioData) {
    return <PortfolioSkeleton />;
  }

  return (
    <div className="space-y-8 px-4 md:px-8 lg:px-16 xl:px-24">
      {isRefreshing && <LoadingIndicator fullScreen message="Refreshing portfolio data..." />}

      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Investment Portfolio
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Detailed view of your portfolio performance and holdings.
          </p>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsImportExportModalOpen(true)}
            className="px-4 py-2 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <FiUpload className="mr-2" />
            Import/Export
          </Button>
          
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

      {portfolioData && portfolioSummary && portfolioData.allocationAnalysis && portfolioData.portfolio && (
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
                      {formatCurrency(portfolioSummary.totalInvested, user.settings.currency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Return */}
              <div className="p-4">
                <div className="flex items-center">
                  <div className={`p-3 rounded-full ${portfolioSummary.totalResult >= 0 ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'} mr-4`}>
                    {portfolioSummary.totalResult >= 0 ? (
                      <FiTrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <FiTrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">RETURN</h3>
                    <p className={`text-xl font-bold ${portfolioSummary.totalResult >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} mt-1`}>
                      {formatCurrency(portfolioSummary.totalResult, user.settings.currency, true)}
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
                      {formatCurrency(portfolioSummary.estimatedAnnualDividend, user.settings.currency)}
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
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1" title={portfolioSummary.fetchDate}>
                      {formatDateTime(portfolioSummary.fetchDate)}
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
                {portfolioData.allocationAnalysis && (
                  <>
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
                            <span className={`font-medium ${value.startsWith('-') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
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

                  {/* Instruments Table - Now using SortableTable */}
                  <SortableTable
                    data={portfolio.instruments}
                    itemsPerPage={10}
                    emptyMessage="No instruments found in this portfolio."
                    columns={[
                      {
                        key: "fullName",
                        header: "Instrument",
                        sortable: true,
                        filterable: true,
                        render: (item) => (
                          <span className="font-medium text-gray-900 dark:text-gray-100">{item.fullName}</span>
                        )
                      },
                      {
                        key: "ticker",
                        header: "Ticker",
                        sortable: true,
                        filterable: true,
                        render: (item) => (
                          <span className="text-gray-500 dark:text-gray-400">{item.ticker}</span>
                        )
                      },
                      {
                        key: "type",
                        header: "Type",
                        sortable: true,
                        filterable: true,
                        render: (item) => (
                          <span className="text-gray-500 dark:text-gray-400">{item.type}</span>
                        )
                      },
                      {
                        key: "ownedQuantity",
                        header: "Quantity",
                        sortable: true,
                        render: (item) => (
                          <span className="text-gray-900 dark:text-gray-100">{item.ownedQuantity.toFixed(2)}</span>
                        )
                      },
                      {
                        key: "investedValue",
                        header: "Invested",
                        sortable: true,
                        render: (item) => (
                          <span className="text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.investedValue, user.settings.currency)}
                          </span>
                        )
                      },
                      {
                        key: "currentValue",
                        header: "Current Value",
                        sortable: true,
                        render: (item) => (
                          <span className="text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.currentValue, user.settings.currency)}
                          </span>
                        )
                      },
                      {
                        key: "resultValue",
                        header: "Result",
                        sortable: true,
                        render: (item) => (
                          <span className={`font-semibold ${item.resultValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(item.resultValue, user.settings.currency, true)}
                          </span>
                        )
                      },
                      {
                        key: "dividendYield",
                        header: "Div. Yield",
                        sortable: true,
                        render: (item) => (
                          <span className="text-gray-900 dark:text-gray-100">
                            {item.dividendYield ? `${item.dividendYield}%` : 'N/A'}
                          </span>
                        )
                      },
                      {
                        key: "performance_1week",
                        header: "1W Perf.",
                        sortable: true,
                        render: (item) => (
                          <span className={`${item.performance_1week >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {item.performance_1week ? formatPercentage(item.performance_1week) : 'N/A'}
                          </span>
                        )
                      },
                      {
                        key: "performance_1month",
                        header: "1M Perf.",
                        sortable: true,
                        render: (item) => (
                          <span className={`${item.performance_1month >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {item.performance_1month ? formatPercentage(item.performance_1month) : 'N/A'}
                          </span>
                        )
                      },
                      {
                        key: "performance_3months",
                        header: "3M Perf.",
                        sortable: true,
                        render: (item) => (
                          <span className={`${item.performance_3months >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {item.performance_3months ? formatPercentage(item.performance_3months) : 'N/A'}
                          </span>
                        )
                      },
                      {
                        key: "performance_1year",
                        header: "1Y Perf.",
                        sortable: true,
                        render: (item) => (
                          <span className={`${item.performance_1year >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {item.performance_1year ? formatPercentage(item.performance_1year) : 'N/A'}
                          </span>
                        )
                      }
                    ]}
                  />
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

      {/* Import/Export Modal */}
      {isImportExportModalOpen && (
        <ImportExportModal
          onClose={() => setIsImportExportModalOpen(false)}
          onImport={handleImportPie}
          portfolioData={portfolioData}
          isImporting={isImporting}
        />
      )}
    </div>
  );
}
