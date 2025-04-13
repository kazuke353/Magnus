import { useLoaderData, useSubmit, useNavigation, Link, json } from "@remix-run/react";
    import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
    import { useCallback, useMemo, useState, useEffect, useRef } from "react";
    import { requireAuthentication } from "~/services/auth.server";
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
    import WatchlistItemDetail from "~/components/WatchlistItemDetail"; // Reuse for now
    import { errorResponse, createApiError } from "~/utils/error-handler";
    import { WatchlistItem } from "~/utils/portfolio/types"; // Import WatchlistItem type

    // Interfaces
    interface HistoricalValue { date: string; value: number; }
    interface Benchmark { name: string; returnPercentage: number; }

    interface PortfolioLoaderData {
      user: Awaited<ReturnType<typeof requireAuthentication>>;
      error?: any;
    }

    // --- Loader ---
    export const loader = async ({ request }: LoaderFunctionArgs) => {
      try {
        const user = await requireAuthentication(request);
        return json({ user, error: null });
      } catch (error) {
        if (error instanceof Response) { throw error; }
        console.error("Error loading initial portfolio page data (user):", error);
        const apiError = createApiError(error, 500);
        return json({ user: null, error: { message: apiError.message, details: apiError.details } }, { status: apiError.status });
      }
    };

    // --- Action ---
    export const action = async ({ request }: ActionFunctionArgs) => {
         try {
            const user = await requireAuthentication(request);
            const formData = await request.formData();
            const actionType = formData.get("_action");

            // --- Import Action ---
            if (actionType === "import") {
              try {
                const pieDataJson = formData.get("pieData") as string;
                if (!pieDataJson) throw new Error("No pie data provided");
                const pieData = JSON.parse(pieDataJson);
                // TODO: Implement actual import logic
                return json({ success: true, message: `Successfully imported ${pieData.name}` });
              } catch (error) {
                console.error("Error importing pie data:", error);
                return json({ success: false, error: "Error importing pie data: " + (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
              }
            }
            // --- Save Historical Data Action ---
            else if (actionType === "saveHistoricalData") {
              try {
                const historicalDataJson = formData.get("historicalData") as string;
                if (!historicalDataJson) throw new Error("No historical data provided");
                const historicalData = JSON.parse(historicalDataJson);
                // TODO: Implement actual save logic
                return json({ success: true, message: `Saved ${historicalData.length} historical points` });
              } catch (error) {
                console.error("Error saving historical data:", error);
                return json({ success: false, error: "Error saving historical data: " + (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
              }
            }
            // --- Save Benchmarks Action ---
            else if (actionType === "saveBenchmarks") {
              try {
                const benchmarksJson = formData.get("benchmarks") as string;
                if (!benchmarksJson) throw new Error("No benchmarks provided");
                const benchmarks = JSON.parse(benchmarksJson);
                // TODO: Implement actual save logic
                return json({ success: true, message: `Saved ${benchmarks.length} benchmarks` });
              } catch (error) {
                console.error("Error saving benchmarks:", error);
                return json({ success: false, error: "Error saving benchmarks: " + (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
              }
            }
            // --- Update Watchlist Item Action (Needed for Detail View) ---
            else if (actionType === "updateWatchlistItem") {
                try {
                    const ticker = formData.get("ticker") as string;
                    const updatesJson = formData.get("updates") as string;
                    if (!ticker || !updatesJson) throw new Error("Ticker and updates required");
                    const updates = JSON.parse(updatesJson);
                    // TODO: Implement actual update logic using portfolio services
                    console.log(`Updating watchlist item ${ticker} with:`, updates);
                    // Simulate success for now
                    return json({ success: true, message: `Updated ${ticker}` });
                } catch (error) {
                    console.error("Error updating watchlist item:", error);
                    return json({ success: false, error: "Error updating item: " + (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
                }
            }

            return json({ error: "Invalid action" }, { status: 400 });
          } catch (error) {
             if (error instanceof Response) { throw error; }
             const apiError = createApiError(error);
             return json({ success: false, error: apiError.message }, { status: apiError.status });
          }
    };

    // --- Component ---
    export default function Portfolio() {
      const initialData = useLoaderData<PortfolioLoaderData>();
      const navigation = useNavigation();
      const submit = useSubmit();

      if (!initialData) {
        console.error("Portfolio component received null initialData from useLoaderData.");
        return <div className="p-8 text-center text-red-500">Error loading initial page data. Please try refreshing.</div>;
      }

      const { user, error: initialLoaderError } = initialData.error
        ? { user: null, error: initialData.error }
        : { ...initialData, error: null };

      // State for background fetched data
      const [portfolioData, setPortfolioData] = useState<PerformanceMetrics | null>(null);
      const [localHistoricalValues, setLocalHistoricalValues] = useState<HistoricalValue[]>([]);
      const [localBenchmarks, setLocalBenchmarks] = useState<Benchmark[]>([]);

      // State for background fetch status
      const [detailsLoading, setDetailsLoading] = useState(true);
      const [detailsError, setDetailsError] = useState<string | null>(null);
      const fetchInitiated = useRef(false);

      // State for modals
      const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
      const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState(false);

      // --- NEW: State for selected portfolio item ---
      const [selectedPortfolioItemTicker, setSelectedPortfolioItemTicker] = useState<string | null>(null);

      // --- Effect to fetch portfolio details ---
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
                               throw new Error(errorMsg);
                           });
                        } return response.json();
                    })
                    .then(data => {
                         if (data && typeof data === 'object') {
                            setPortfolioData(data.portfolioData || null);
                            setLocalHistoricalValues(data.historicalValues || []);
                            setLocalBenchmarks(data.benchmarks || []);
                            if (data.error) { setDetailsError(data.error); showToast({ type: "error", message: data.error }); }
                         } else { throw new Error("Invalid data format received"); }
                    })
                    .catch(error => {
                        setDetailsError(error.message || "Network error loading portfolio details.");
                        showToast({ type: "error", message: "Network error: Could not load portfolio details." });
                        setPortfolioData(null); setLocalHistoricalValues([]); setLocalBenchmarks([]);
                    })
                    .finally(() => { setDetailsLoading(false); });
            }
        }, [user]);

       // --- Effect for initial loader error toast ---
       useEffect(() => {
         if (initialLoaderError) { showToast({ type: "error", message: initialLoaderError.message || "Error loading page data" }); }
       }, [initialLoaderError]);

      // --- Action Handlers ---
      const handleRefresh = useCallback(() => { fetch("/api/portfolio?refresh=true"); showToast({ type: "info", message: "Refreshing..." }); }, [submit]);
      const handleImportPie = useCallback((pieData: any) => { const fd = new FormData(); fd.append("_action", "import"); fd.append("pieData", JSON.stringify(pieData)); submit(fd, { method: "post" }); showToast({ type: "info", message: "Importing..." }); }, [submit]);
      const handleSaveHistoricalData = useCallback((data: HistoricalValue[]) => { setLocalHistoricalValues(data); const fd = new FormData(); fd.append("_action", "saveHistoricalData"); fd.append("historicalData", JSON.stringify(data)); submit(fd, { method: "post" }); showToast({ type: "info", message: "Saving history..." }); }, [submit]);
      const handleSaveBenchmarks = useCallback((data: Benchmark[]) => { setLocalBenchmarks(data); const fd = new FormData(); fd.append("_action", "saveBenchmarks"); fd.append("benchmarks", JSON.stringify(data)); submit(fd, { method: "post" }); showToast({ type: "info", message: "Saving benchmarks..." }); }, [submit]);

      // --- NEW: Handler for selecting a portfolio item ---
      const handleSelectPortfolioItem = useCallback((ticker: string) => {
        setSelectedPortfolioItemTicker(ticker);
      }, []);

      // --- NEW: Handler to go back from detail view ---
      const handleBackFromPortfolioDetail = useCallback(() => {
        setSelectedPortfolioItemTicker(null);
      }, []);

      // --- NEW: Handler for updating item from detail view (needed by WatchlistItemDetail) ---
      const handleUpdatePortfolioItem = useCallback((ticker: string, updates: Partial<WatchlistItem>) => {
          // In a real portfolio scenario, updating notes/target might not apply directly
          // to a portfolio holding in the same way as a watchlist item.
          // This might need a different action or be disabled for portfolio items.
          // For now, let's log it and potentially use a generic update action if needed.
          console.log(`Attempting to update portfolio item ${ticker} with:`, updates);
          showToast({ type: "info", message: `Updating ${ticker}... (Portfolio update logic needed)` });

          // Example using a hypothetical action (adjust as needed)
          // const formData = new FormData();
          // formData.append("_action", "updatePortfolioItem"); // Or reuse watchlist update?
          // formData.append("ticker", ticker);
          // formData.append("updates", JSON.stringify(updates));
          // submit(formData, { method: "post" });

      }, [submit]);

      // --- Navigation/Action states ---
      const isActionSubmitting = navigation.state === "submitting";
      const isRefreshing = isActionSubmitting && navigation.formData?.get("_action") === "refresh";
      const isImporting = isActionSubmitting && navigation.formData?.get("_action") === "import";

      // --- Effects for action results (Toasts) ---
      useEffect(() => { if (navigation.state === "idle" && navigation.formData?.get("_action") === "refresh" && navigation.formData?.get("success")) { showToast({ type: "success", message: "Refreshed" }); } }, [navigation]);
      useEffect(() => { if (navigation.state === "idle" && navigation.formData?.get("_action") === "import") { const d = navigation.formData; if (d?.get("success")) { showToast({ type: "success", message: d.get("message") || "Imported" }); setIsImportExportModalOpen(false); } else { showToast({ type: "error", message: d?.get("error") || "Import failed" }); } } }, [navigation]);
      useEffect(() => { if (navigation.state === "idle" && navigation.formData?.get("_action") === "saveHistoricalData" && navigation.formData?.get("success")) { showToast({ type: "success", message: "History saved" }); } }, [navigation]);
      useEffect(() => { if (navigation.state === "idle" && navigation.formData?.get("_action") === "saveBenchmarks" && navigation.formData?.get("success")) { showToast({ type: "success", message: "Benchmarks saved" }); } }, [navigation]);
      useEffect(() => { if (navigation.state === "idle" && navigation.formData?.get("_action") === "updateWatchlistItem" && navigation.formData?.get("success")) { showToast({ type: "success", message: navigation.formData.get("message") || "Item updated" }); } }, [navigation]);


      // --- Memoized Portfolio Summary ---
      const portfolioSummary = useMemo(() => {
        if (!portfolioData?.overallSummary?.overallSummary) return null;
        return {
          totalInvested: portfolioData.overallSummary.overallSummary.totalInvestedOverall || 0,
          totalResult: portfolioData.overallSummary.overallSummary.totalResultOverall || 0,
          returnPercentage: portfolioData.overallSummary.overallSummary.returnPercentageOverall || 0,
          fetchDate: portfolioData.overallSummary.overallSummary.fetchDate || new Date().toISOString(),
          estimatedAnnualDividend: portfolioData.allocationAnalysis?.estimatedAnnualDividend || 0
        };
      }, [portfolioData]);

      // --- Authentication Check ---
      if (!user) {
        return (
          <div className="flex items-center justify-center h-full">
            <Card className="max-w-md">
              <div className="text-center p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Authentication Required</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Please log in to view your portfolio.</p>
                <Link to="/login" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Go to Login</Link>
              </div>
            </Card>
          </div>
        );
      }

      // --- Main Render Logic ---
      return (
        <div className="space-y-8 px-4 md:px-8 lg:px-16 xl:px-24">
          {isRefreshing && <LoadingIndicator fullScreen message="Refreshing portfolio data..." />}

          {/* --- Conditional Rendering: Detail View or Main Portfolio View --- */}
          {selectedPortfolioItemTicker ? (
            // --- Detail View ---
            <WatchlistItemDetail
              ticker={selectedPortfolioItemTicker}
              currency={user.settings.currency}
              onBack={handleBackFromPortfolioDetail}
              onRemove={() => { /* Removing from portfolio is complex, disable/rethink */ showToast({ type: 'warning', message: 'Removing items directly from portfolio view is not supported.' }); }}
              onUpdate={handleUpdatePortfolioItem} // Use the new handler
              context="portfolio" // <-- Pass the context prop
            />
          ) : (
            // --- Main Portfolio View ---
            <>
              <PortfolioHeader
                onRefresh={handleRefresh}
                onImportExport={() => setIsImportExportModalOpen(true)}
                isRefreshing={isRefreshing}
              />

              {detailsLoading ? (
                <PortfolioSkeleton />
              ) : detailsError ? (
                <Card><p className="p-4 text-center text-red-600 dark:text-red-400">Error loading portfolio details: {detailsError}</p></Card>
              ) : !portfolioData ? (
                <EmptyPortfolioState onRefresh={handleRefresh} />
              ) : (
                <>
                  {portfolioSummary && portfolioData.allocationAnalysis && portfolioData.portfolio ? (
                    <>
                      <PortfolioSummary
                        totalInvested={portfolioSummary.totalInvested}
                        totalResult={portfolioSummary.totalResult}
                        returnPercentage={portfolioSummary.returnPercentage}
                        fetchDate={portfolioSummary.fetchDate}
                        estimatedAnnualDividend={portfolioSummary.estimatedAnnualDividend}
                        currency={user.settings.currency}
                      />
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
                      {/* Pass the selection handler to PortfolioBreakdown */}
                      <PortfolioBreakdown
                        portfolios={portfolioData.portfolio}
                        currency={user.settings.currency}
                        onSelectItem={handleSelectPortfolioItem} // Pass the handler
                      />
                      <ChatPromo />
                    </>
                  ) : (
                    <Card><p className="p-4 text-center text-gray-500">Portfolio data is incomplete.</p></Card>
                  )}
                </>
              )}
            </>
          )}

          {/* Modals */}
          {isImportExportModalOpen && (
            <ImportExportModal
               onClose={() => setIsImportExportModalOpen(false)}
               onImport={handleImportPie}
               portfolioData={portfolioData}
               isImporting={isImporting}
               currency={user.settings.currency} // Pass currency
            />
          )}
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
