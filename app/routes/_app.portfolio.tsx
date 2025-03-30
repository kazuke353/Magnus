import { useLoaderData, useSubmit, useNavigation, Link, json } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
// Removed direct service imports if only used in loader before
// import { getPortfolioData, savePortfolioData } from "~/services/portfolio.server";
import { useCallback, useMemo, useState, useEffect, useRef } from "react"; // <-- Add useRef
import { requireAuthentication } from "~/services/auth.server";
import { PerformanceMetrics } from "~/utils/portfolio_fetcher";
import Card from "~/components/Card";
import PortfolioSummary from "~/components/PortfolioSummary";
import PortfolioHeader from "~/components/PortfolioHeader";
import PortfolioVisualizations from "~/components/PortfolioVisualizations";
import PortfolioBreakdown from "~/components/PortfolioBreakdown";
import ChatPromo from "~/components/ChatPromo";
import LoadingIndicator from "~/components/LoadingIndicator";
import PortfolioSkeleton from "~/components/PortfolioSkeleton"; // Keep for background loading state
import EmptyPortfolioState from "~/components/EmptyPortfolioState";
import { showToast } from "~/components/ToastContainer";
import ImportExportModal from "~/components/ImportExportModal";
import RebalanceModal from "~/components/RebalanceModal";
import { errorResponse, createApiError } from "~/utils/error-handler";

// Interfaces can be defined here or imported from a types file
interface HistoricalValue { date: string; value: number; }
interface Benchmark { name: string; returnPercentage: number; }

// --- Loader and Action definitions from above ---

// Updated LoaderData type
interface PortfolioLoaderData {
  user: Awaited<ReturnType<typeof requireAuthentication>>;
  error?: any; // Keep error handling for loader issues (user fetch)
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Only fetch the user, which is fast
    const user = await requireAuthentication(request, "/login");
    // Return only the user data in the expected structure
    return json({ user, error: null }); // Ensure structure matches PortfolioLoaderData

  } catch (error) {
    // Handle errors from requireAuthentication (like redirects)
    if (error instanceof Response) {
        throw error;
    }
    // For other errors, return a JSON object with user: null and error details
    console.error("Error loading initial portfolio page data (user):", error);
    const apiError = createApiError(error, 500); // Use your error handler utility
    // **Crucially, return the error structure expected by the component**
    return json({ user: null, error: { message: apiError.message, details: apiError.details } }, { status: apiError.status });
  }
};
// --- END LOADER ---


// --- Action Function remains unchanged ---
export const action = async ({ request }: ActionFunctionArgs) => {
     try {
        const user = await requireAuthentication(request, "/login");
        const formData = await request.formData();
        const actionType = formData.get("_action");

        if (actionType === "import") {
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
         if (error instanceof Response) { throw error; }
         const apiError = createApiError(error);
         return json({ success: false, error: apiError.message }, { status: apiError.status });
      }
};

export default function Portfolio() {
  const initialData = useLoaderData<PortfolioLoaderData>();
  const navigation = useNavigation();
  const submit = useSubmit();

  // --- ADD NULL CHECK FOR initialData ---
  if (!initialData) {
    // This case might happen during SSR errors or if the loader fails unexpectedly
    // before returning any response. Render a safe fallback.
    console.error("Portfolio component received null initialData from useLoaderData.");
    // You might want a more specific error component here
    return (
        <div className="p-8 text-center text-red-500">
            Error loading initial page data. Please try refreshing.
        </div>
     );
  }


  // Now it's safe to access initialData
  const { user, error: initialLoaderError } = initialData.error
    ? { user: null, error: initialData.error }
    : { ...initialData, error: null };

  // State for data fetched in the background
  const [portfolioData, setPortfolioData] = useState<PerformanceMetrics | null>(null);
  const [localHistoricalValues, setLocalHistoricalValues] = useState<HistoricalValue[]>([]);
  const [localBenchmarks, setLocalBenchmarks] = useState<Benchmark[]>([]);

  // State for background fetch status
  const [detailsLoading, setDetailsLoading] = useState(true); // Start loading true
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const fetchInitiated = useRef(false); // Prevent multiple fetches

  // State for modals
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState(false);


  // Effect to fetch portfolio details in background ONCE
   useEffect(() => {
        if (!fetchInitiated.current && user) {
            fetchInitiated.current = true;
            setDetailsLoading(true);
            setDetailsError(null);

            fetch("/api/portfolio")
                .then(response => {
                    if (!response.ok) {
                       return response.json().catch(() => null).then(body => {
                           const errorMsg = body?.error || `HTTP error! Status: ${response.status}`;
                           console.error("API Response Error (Portfolio Details):", response.status, body);
                           throw new Error(errorMsg);
                       });
                    }
                    return response.json();
                })
                .then(data => {
                     // Add type guard or check for expected structure
                     if (data && typeof data === 'object') {
                        setPortfolioData(data.portfolioData || null); // Handle null case from API
                        setLocalHistoricalValues(data.historicalValues || []);
                        setLocalBenchmarks(data.benchmarks || []);
                        if (data.error) { // Check if the API itself returned an error field
                           setDetailsError(data.error);
                           showToast({ type: "error", message: data.error, duration: 5000 });
                        }
                     } else {
                         throw new Error("Invalid data format received");
                     }
                })
                .catch(error => {
                    console.error("Fetch failed for portfolio details:", error);
                    setDetailsError(error.message || "Network error loading portfolio details.");
                    showToast({ type: "error", message: "Network error: Could not load portfolio details.", duration: 5000 });
                    // Reset data on fetch error
                    setPortfolioData(null);
                    setLocalHistoricalValues([]);
                    setLocalBenchmarks([]);
                })
                .finally(() => {
                    setDetailsLoading(false); // Loading finished
                });
        }
    }, [user]); // Depend on user being available


   // Show initial loader error toast (for user fetch)
   useEffect(() => {
     if (initialLoaderError) {
       showToast({
         type: "error",
         message: initialLoaderError.message || "An error occurred loading initial page data",
         duration: 5000
       });
     }
   }, [initialLoaderError]);


  // --- Action Handlers (handleRefresh, handleImportPie, etc.) remain mostly the same ---
  // Note: handleRefresh might need adjustment based on how the action returns data.
  const handleRefresh = useCallback(() => {
    fetch("/api/portfolio?refresh=true");
    showToast({ type: "info", message: "Refreshing portfolio data...", duration: 3000 });
  }, [submit]);

   const handleImportPie = useCallback((pieData: any) => { /* ... same ... */
        const formData = new FormData();
        formData.append("_action", "import");
        formData.append("pieData", JSON.stringify(pieData));
        submit(formData, { method: "post" });
        showToast({ type: "info", message: "Importing pie data...", duration: 3000 });
    }, [submit]);

   const handleSaveHistoricalData = useCallback((data: HistoricalValue[]) => { /* ... same ... */
        setLocalHistoricalValues(data); // Optimistic UI update
        const formData = new FormData();
        formData.append("_action", "saveHistoricalData");
        formData.append("historicalData", JSON.stringify(data));
        submit(formData, { method: "post" });
        showToast({ type: "info", message: "Saving historical data...", duration: 2000 });
   }, [submit]);

   const handleSaveBenchmarks = useCallback((data: Benchmark[]) => { /* ... same ... */
        setLocalBenchmarks(data); // Optimistic UI update
        const formData = new FormData();
        formData.append("_action", "saveBenchmarks");
        formData.append("benchmarks", JSON.stringify(data));
        submit(formData, { method: "post" });
        showToast({ type: "info", message: "Saving benchmarks...", duration: 2000 });
   }, [submit]);


  // --- Navigation/Action states remain the same ---
  const isActionSubmitting = navigation.state === "submitting";
  const isRefreshing = isActionSubmitting && navigation.formData?.get("_action") === "refresh";
  const isImporting = isActionSubmitting && navigation.formData?.get("_action") === "import";

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


  // Memoize the portfolio summary data based on component state
  const portfolioSummary = useMemo(() => {
    // Depends on the portfolioData state now
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

  return (
    <div className="space-y-8 px-4 md:px-8 lg:px-16 xl:px-24">
      {/* Show loading indicator ONLY for explicit refresh action */}
      {isRefreshing && <LoadingIndicator fullScreen message="Refreshing portfolio data..." />}

      {/* Header is always visible once user is loaded */}
      <PortfolioHeader
        onRefresh={handleRefresh}
        onImportExport={() => setIsImportExportModalOpen(true)}
        // Pass the specific refreshing state, not the general background loading state
        isRefreshing={isRefreshing}
      />

      {/* Use detailsLoading state for the main content skeleton/empty state */}
      {detailsLoading ? (
        <PortfolioSkeleton />
      ) : detailsError ? (
          <Card>
             <p className="p-4 text-center text-red-600 dark:text-red-400">
               Error loading portfolio details: {detailsError}
             </p>
              {/* Optionally add a retry button */}
              {/* <button onClick={() => fetchInitiated.current = false}>Retry</button> */}
          </Card>
      ) : !portfolioData ? (
          // No error, not loading, but no data (maybe API returned null)
          <EmptyPortfolioState onRefresh={handleRefresh} />
      ) : (
        // Data loaded successfully
        <>
          {portfolioSummary && portfolioData.allocationAnalysis && portfolioData.portfolio ? (
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
                  historicalValues={localHistoricalValues} // Use state variable
                  benchmarks={localBenchmarks}             // Use state variable
                  onRebalanceClick={() => setIsRebalanceModalOpen(true)}
                  onSaveHistoricalData={handleSaveHistoricalData} // Pass handlers
                  onSaveBenchmarks={handleSaveBenchmarks}         // Pass handlers
                />

                {/* Portfolio Breakdown */}
                <PortfolioBreakdown
                  portfolios={portfolioData.portfolio}
                  currency={user.settings.currency}
                />

                {/* Chat assistant promo */}
                <ChatPromo />
            </>
           ) : (
             // Should not happen if portfolioData exists, but safety check
              <Card><p className="p-4 text-center text-gray-500">Portfolio data is incomplete.</p></Card>
           )}
        </>
      )}


      {/* Modals (logic remains the same) */}
      {isImportExportModalOpen && (
        <ImportExportModal /* ... props ... */
           onClose={() => setIsImportExportModalOpen(false)}
           onImport={handleImportPie}
           portfolioData={portfolioData} // Pass current state data
           isImporting={isImporting}
        />
      )}
      {isRebalanceModalOpen && portfolioData && (
        <RebalanceModal /* ... props ... */
            portfolioData={portfolioData} // Pass current state data
            onClose={() => setIsRebalanceModalOpen(false)}
            currency={user.settings.currency}
        />
      )}
    </div>
  );
}
