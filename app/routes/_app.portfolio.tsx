import { useLoaderData, useSubmit, useNavigation, Link, json } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useCallback, useMemo, useState, useEffect } from "react";
import { requireAuthentication } from "~/services/auth.server";
import { getPortfolioData, savePortfolioData } from "~/services/portfolio.server";
import { PerformanceMetrics } from "~/utils/portfolio_fetcher";
import Card from "~/components/Card";
import PortfolioSummary from "~/components/PortfolioSummary";
import PortfolioHeader from "~/components/PortfolioHeader";
import PortfolioVisualizations from "~/components/PortfolioVisualizations";
import PortfolioBreakdown from "~/components/PortfolioBreakdown";
import ChatPromo from "~/components/ChatPromo";
import LoadingIndicator from "~/components/LoadingIndicator";
import PortfolioSkeleton from "~/components/PortfolioSkeleton";
import EmptyPortfolioState from "~/components/EmptyPortfolioState";
import { showToast } from "~/components/ToastContainer";
import ImportExportModal from "~/components/ImportExportModal";
import RebalanceModal from "~/components/RebalanceModal";
import { errorResponse, createApiError } from "~/utils/error-handler";

// Define interfaces for historical data
interface HistoricalValue {
  date: string;
  value: number;
}

interface Benchmark {
  name: string;
  returnPercentage: number;
}

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
        // Force fresh data fetch
        portfolioData = await getPortfolioData(user.settings.monthlyBudget, user.settings.country);

        if (portfolioData) {
          await savePortfolioData(user.id, portfolioData);
        }
      }
    } catch (loadError) {
      console.error("Error loading portfolio data in loader:", loadError);
      throw createApiError("Failed to load portfolio data", { originalError: loadError });
    }

    // In a real implementation, you would load these from a database
    // For now, we'll use mock data
    const historicalValues: HistoricalValue[] = [
      { date: '2023-01-01', value: 10000 },
      { date: '2023-02-01', value: 10200 },
      { date: '2023-03-01', value: 10150 },
      { date: '2023-04-01', value: 10400 },
      { date: '2023-05-01', value: 10600 },
      { date: '2023-06-01', value: 10550 },
    ];

    const benchmarks: Benchmark[] = [
      { name: 'S&P 500', returnPercentage: 8.5 },
      { name: 'MSCI World', returnPercentage: 7.2 },
    ];

    return json({ 
      user, 
      portfolioData,
      historicalValues,
      benchmarks
    }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' } });
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
    } else if (actionType === "saveHistoricalData") {
      try {
        const historicalDataJson = formData.get("historicalData") as string;
        if (!historicalDataJson) {
          throw new Error("No historical data provided");
        }

        const historicalData = JSON.parse(historicalDataJson);
        
        // In a real implementation, you would save this to a database
        // For now, we'll just return success
        return json({ 
          success: true, 
          message: `Successfully saved ${historicalData.length} historical data points` 
        });
      } catch (error) {
        console.error("Error saving historical data:", error);
        return json({
          success: false,
          error: "Error saving historical data: " + (error instanceof Error ? error.message : "Unknown error")
        }, { status: 500 });
      }
    } else if (actionType === "saveBenchmarks") {
      try {
        const benchmarksJson = formData.get("benchmarks") as string;
        if (!benchmarksJson) {
          throw new Error("No benchmarks provided");
        }

        const benchmarks = JSON.parse(benchmarksJson);
        
        // In a real implementation, you would save this to a database
        // For now, we'll just return success
        return json({ 
          success: true, 
          message: `Successfully saved ${benchmarks.length} benchmarks` 
        });
      } catch (error) {
        console.error("Error saving benchmarks:", error);
        return json({
          success: false,
          error: "Error saving benchmarks: " + (error instanceof Error ? error.message : "Unknown error")
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
  const { user, portfolioData: initialPortfolioData, historicalValues, benchmarks, error } = loaderData.error
    ? { user: null, portfolioData: null, historicalValues: [], benchmarks: [], error: loaderData.error }
    : { ...loaderData, error: null };

  const [portfolioData, setPortfolioData] = useState<PerformanceMetrics | null>(initialPortfolioData);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState(false);
  const [localHistoricalValues, setLocalHistoricalValues] = useState<HistoricalValue[]>(historicalValues || []);
  const [localBenchmarks, setLocalBenchmarks] = useState<Benchmark[]>(benchmarks || []);

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

  const handleSaveHistoricalData = useCallback((data: HistoricalValue[]) => {
    setLocalHistoricalValues(data);
    
    const formData = new FormData();
    formData.append("_action", "saveHistoricalData");
    formData.append("historicalData", JSON.stringify(data));
    submit(formData, { method: "post" });
    
    showToast({
      type: "info",
      message: "Saving historical data...",
      duration: 2000
    });
  }, [submit]);

  const handleSaveBenchmarks = useCallback((data: Benchmark[]) => {
    setLocalBenchmarks(data);
    
    const formData = new FormData();
    formData.append("_action", "saveBenchmarks");
    formData.append("benchmarks", JSON.stringify(data));
    submit(formData, { method: "post" });
    
    showToast({
      type: "info",
      message: "Saving benchmarks...",
      duration: 2000
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

  // Handle successful historical data save
  useEffect(() => {
    if (navigation.state === "idle" && navigation.formData?.get("_action") === "saveHistoricalData") {
      const actionData = navigation.formData;

      if (actionData && "success" in actionData && actionData.success) {
        showToast({
          type: "success",
          message: "Historical data saved successfully",
          duration: 3000
        });
      }
    }
  }, [navigation.state, navigation.formData]);

  // Handle successful benchmarks save
  useEffect(() => {
    if (navigation.state === "idle" && navigation.formData?.get("_action") === "saveBenchmarks") {
      const actionData = navigation.formData;

      if (actionData && "success" in actionData && actionData.success) {
        showToast({
          type: "success",
          message: "Benchmarks saved successfully",
          duration: 3000
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

      <PortfolioHeader 
        onRefresh={handleRefresh}
        onImportExport={() => setIsImportExportModalOpen(true)}
        isRefreshing={isRefreshing}
      />

      {!portfolioData && !isRefreshing && (
        <EmptyPortfolioState onRefresh={handleRefresh} />
      )}

      {portfolioData && portfolioSummary && portfolioData.allocationAnalysis && portfolioData.portfolio && (
        <>
          {/* Overall Portfolio Summary */}
          <PortfolioSummary
            totalInvested={portfolioSummary.totalInvested}
            totalResult={portfolioSummary.totalResult}
            returnPercentage={portfolioSummary.returnPercentage}
            fetchDate={portfolioSummary.fetchDate}
            estimatedAnnualDividend={portfolioSummary.estimatedAnnualDividend}
            currency={user.settings.currency}
          />

          {/* Portfolio Visualizations */}
          <PortfolioVisualizations
            portfolioData={portfolioData}
            currency={user.settings.currency}
            currentValue={portfolioSummary.totalInvested + portfolioSummary.totalResult}
            historicalValues={localHistoricalValues}
            benchmarks={localBenchmarks}
            onRebalanceClick={() => setIsRebalanceModalOpen(true)}
            onSaveHistoricalData={handleSaveHistoricalData}
            onSaveBenchmarks={handleSaveBenchmarks}
          />

          {/* Portfolio Breakdown */}
          <PortfolioBreakdown
            portfolios={portfolioData.portfolio}
            currency={user.settings.currency}
          />

          {/* Chat assistant promo */}
          <ChatPromo />
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

      {/* Rebalance Modal */}
      {isRebalanceModalOpen && portfolioData && (
        <RebalanceModal
          portfolioData={portfolioData}
          onClose={() => setIsRebalanceModalOpen(false)}
          currency={user.settings.currency}
        />
      )}
    </div>
  );
}
