import { useState, useEffect, useMemo } from 'react';
    import { useFetcher } from '@remix-run/react';
    import { FiArrowLeft, FiEdit2, FiTrash2, FiTrendingUp, FiTrendingDown, FiMinusCircle, FiDollarSign, FiCalendar } from 'react-icons/fi'; // Added icons for tabs
    import Button from './Button'; // Assuming path is correct
    import Card from './Card'; // Assuming path is correct
    import Tabs from './Tabs'; // Assuming path is correct
    import InteractivePriceChart from './InteractivePriceChart'; // Assuming path is correct
    import FastFactsPanel from './FastFactsPanel'; // Assuming path is correct
    import CompanyInfoPanel from './CompanyInfoPanel'; // Assuming path is correct
    import AnalystScorecardPanel from './AnalystScorecardPanel'; // Assuming path is correct
    import LoadingIndicator from './LoadingIndicator'; // Assuming path is correct
    import { InstrumentMetadata, FetchedInstrumentDetails, WatchlistItem, RecommendationTrend, EarningsHistoryEntry } from '~/utils/portfolio/types'; // Import necessary types
    import { formatCurrency, formatPercentage, formatDate } from '~/utils/formatters'; // Import formatters

    // --- Define Types (Keep as before) ---
    interface CombinedWatchlistItemData extends FetchedInstrumentDetails {
      notes?: string;
      targetPrice?: number;
      alertEnabled?: boolean;
    }

    interface WatchlistItemDetailProps {
      ticker: string;
      currency: string; // User's display currency
      onBack: () => void;
      onRemove: (ticker: string) => void;
      onUpdate: (ticker: string, updates: Partial<WatchlistItem>) => void;
      context?: 'watchlist' | 'portfolio'; // <-- Add context prop
    }

    // --- Component Implementation ---

    export default function WatchlistItemDetail({
      ticker,
      currency,
      onBack,
      onRemove,
      onUpdate,
      context = 'watchlist' // <-- Default context to 'watchlist'
    }: WatchlistItemDetailProps) {
      // --- State Management (Keep as before) ---
      const [instrumentData, setInstrumentData] = useState<FetchedInstrumentDetails | null>(null);
      const [watchlistData, setWatchlistData] = useState<WatchlistItem[] | null>(null);
      const [combinedData, setCombinedData] = useState<CombinedWatchlistItemData | null>(null);
      const [instrumentStatus, setInstrumentStatus] = useState<{ loading: boolean; error: string | null }>({ loading: true, error: null });
      const [watchlistStatus, setWatchlistStatus] = useState<{ loading: boolean; error: string | null }>({ loading: true, error: null });
      const [isEditingNotes, setIsEditingNotes] = useState(false);
      const [editNotes, setEditNotes] = useState('');
      const [editTargetPrice, setEditTargetPrice] = useState('');
      const [editError, setEditError] = useState<string | null>(null);

      // --- Fetchers (Keep as before) ---
      const instrumentFetcher = useFetcher<{ instrument: FetchedInstrumentDetails; error?: string }>();
      const watchlistFetcher = useFetcher<{ watchlist: WatchlistItem[]; error?: string }>();

      // --- Data Fetching Effect ---
      useEffect(() => {
        setInstrumentStatus({ loading: true, error: null });
        // Only set watchlist loading if in watchlist context
        if (context === 'watchlist') {
          setWatchlistStatus({ loading: true, error: null });
        } else {
          setWatchlistStatus({ loading: false, error: null }); // Not needed for portfolio
        }
        setInstrumentData(null);
        setWatchlistData(null);
        setCombinedData(null);
        setIsEditingNotes(false);
        setEditError(null);

        console.log(`[EFFECT Fetch] Fetching instrument details for ticker: ${ticker}`);
        instrumentFetcher.load(`/api/instrument-details/${ticker}`);

        // Only fetch watchlist if in watchlist context
        if (context === 'watchlist') {
          console.log(`[EFFECT Fetch] Fetching watchlist data (context: ${context})`);
          watchlistFetcher.load('/api/portfolio/watchlist');
        } else {
           console.log(`[EFFECT Fetch] Skipping watchlist fetch (context: ${context})`);
        }

        return () => {
          console.log(`[EFFECT Fetch] Cleanup for ticker: ${ticker}`);
        };
      }, [ticker, context]); // <-- Add context to dependency array

      // --- Process Instrument Fetcher (Keep as before) ---
      useEffect(() => {
        if (instrumentFetcher.state === 'idle') {
           console.log("[EFFECT Instrument Idle] Processing instrument fetcher result.");
           if (instrumentFetcher.data?.instrument) {
              console.log("[EFFECT Instrument Idle] Success. Setting instrument data.");
              setInstrumentData(instrumentFetcher.data.instrument);
              setInstrumentStatus({ loading: false, error: null });
           } else {
              const errorMsg = instrumentFetcher.data?.error || `Failed to load instrument details for ${ticker}.`;
              console.error("[EFFECT Instrument Idle] Error:", errorMsg);
              setInstrumentData(null);
              setInstrumentStatus({ loading: false, error: errorMsg });
           }
        } else if (instrumentFetcher.state === 'loading') {
             console.log("[EFFECT Instrument Loading] Instrument fetcher is loading...");
        }
      }, [instrumentFetcher.state, instrumentFetcher.data, ticker]);

      // --- Process Watchlist Fetcher (Only if context is watchlist) ---
      useEffect(() => {
        if (context === 'watchlist') {
          if (watchlistFetcher.state === 'idle') {
              console.log("[EFFECT Watchlist Idle] Processing watchlist fetcher result.");
              if (watchlistFetcher.data?.watchlist) {
                  console.log("[EFFECT Watchlist Idle] Success. Setting watchlist data.");
                  setWatchlistData(watchlistFetcher.data.watchlist);
                  setWatchlistStatus({ loading: false, error: null });
              } else {
                  const errorMsg = watchlistFetcher.data?.error || 'Failed to load watchlist.';
                  console.error("[EFFECT Watchlist Idle] Error:", errorMsg);
                  setWatchlistData(null);
                  setWatchlistStatus({ loading: false, error: errorMsg });
              }
          } else if (watchlistFetcher.state === 'loading') {
               console.log("[EFFECT Watchlist Loading] Watchlist fetcher is loading...");
          }
        }
      }, [watchlistFetcher.state, watchlistFetcher.data, context]); // <-- Add context

      // --- Combine Data Effect (Adjusted for context) ---
      useEffect(() => {
        console.log(`[EFFECT Combine Check] Running combine effect. Context: ${context}, Ticker: ${ticker}`);
        console.log(`[EFFECT Combine Check] Status: instrument={loading: ${instrumentStatus.loading}, error: ${instrumentStatus.error}}, watchlist={loading: ${watchlistStatus.loading}, error: ${watchlistStatus.error}}`);
        console.log(`[EFFECT Combine Check] Data: instrumentData=${!!instrumentData}, watchlistData=${!!watchlistData}`);

        setCombinedData(null); // Reset combined data

        // Check if instrument data is ready
        if (!instrumentStatus.loading && !instrumentStatus.error && instrumentData) {
          if (context === 'watchlist') {
            // --- Watchlist Context: Need both instrument and watchlist data ---
            if (!watchlistStatus.loading && !watchlistStatus.error && watchlistData) {
              console.log(`[EFFECT Combine - Watchlist] Both fetches complete for ${ticker}. Attempting to combine.`);
              const specificWatchlistItem = watchlistData.find(item => item.ticker === ticker);

              if (!specificWatchlistItem) {
                console.warn(`[EFFECT Combine - Watchlist] Ticker ${ticker} not found in watchlist. Setting error.`);
                // Set error only if item truly not found in watchlist context
                setWatchlistStatus(prev => ({ ...prev, error: `Ticker ${ticker} not found in your watchlist.` }));
              } else {
                console.log(`[EFFECT Combine - Watchlist] Found watchlist item for ${ticker}. Merging data.`);
                const finalData: CombinedWatchlistItemData = {
                  ...instrumentData,
                  notes: specificWatchlistItem.notes,
                  targetPrice: specificWatchlistItem.targetPrice,
                  alertEnabled: specificWatchlistItem.alertEnabled,
                };
                setCombinedData(finalData);
                setEditNotes(finalData.notes || '');
                setEditTargetPrice(finalData.targetPrice?.toString() || '');
                setWatchlistStatus(prev => ({ ...prev, error: null })); // Clear error on success
              }
            } else {
              console.log(`[EFFECT Combine - Watchlist] Waiting for watchlist data for ${ticker}.`);
            }
          } else {
            // --- Portfolio Context: Only need instrument data ---
            console.log(`[EFFECT Combine - Portfolio] Instrument data ready for ${ticker}. Setting combined data.`);
            const finalData: CombinedWatchlistItemData = {
              ...instrumentData,
              // Set watchlist-specific fields to defaults/null for portfolio context
              notes: undefined,
              targetPrice: undefined,
              alertEnabled: undefined,
            };
            setCombinedData(finalData);
            // Don't set edit state for portfolio items
            setEditNotes('');
            setEditTargetPrice('');
          }
        } else {
          console.log(`[EFFECT Combine] Conditions not met for combining data for ${ticker}. Combined data remains null.`);
        }
      }, [
          instrumentStatus.loading, instrumentStatus.error, instrumentData,
          watchlistStatus.loading, watchlistStatus.error, watchlistData,
          ticker, context // <-- Add context
      ]);

      // --- Event Handlers (Keep as before, but UI might disable them) ---
      const handleSaveNotesAndTarget = () => {
        setEditError(null);
        const updates: Partial<WatchlistItem> = {
          notes: editNotes.trim() || undefined
        };

        if (editTargetPrice.trim()) {
          const parsedPrice = parseFloat(editTargetPrice);
          if (isNaN(parsedPrice) || parsedPrice < 0) {
            setEditError('Please enter a valid positive target price or leave it empty.');
            return;
          }
          updates.targetPrice = parsedPrice;
          updates.alertEnabled = true;
        } else {
          updates.targetPrice = undefined;
          updates.alertEnabled = false;
        }

        console.log(`[handleSaveNotesAndTarget] Calling onUpdate for ${ticker} with updates:`, updates);
        onUpdate(ticker, updates);
        setIsEditingNotes(false);
      };

      // --- Derived Loading/Error States (Adjusted for context) ---
      const isLoading = instrumentStatus.loading || (context === 'watchlist' && watchlistStatus.loading);
      const error = instrumentStatus.error || (context === 'watchlist' ? watchlistStatus.error : null); // Only show watchlist error in watchlist context

      // --- Rendering Logic (Adjusted for context) ---
      if (isLoading) {
         console.log("[RENDER] Showing Loading Indicator");
         return <LoadingIndicator message={`Loading details for ${ticker}...`} />;
      }

      if (error) {
         console.log(`[RENDER] Showing Error: ${error}`);
         return (
           <Card>
             <div className="p-4 space-y-4">
                 <p className="text-red-600 dark:text-red-400">{error}</p>
                 <Button onClick={onBack} variant="outline">
                   <FiArrowLeft className="mr-2" /> Back
                 </Button>
             </div>
           </Card>
         );
      }

      if (!combinedData) {
         // Error message might differ based on context, but a generic one is fine
         const message = `Details currently unavailable for ${ticker}.`;
         console.log(`[RENDER] Showing 'Not Combined' state. Message: ${message}`);
         return (
           <Card>
              <div className="p-4 space-y-4">
                 <p className="text-gray-500 dark:text-gray-400">{message}</p>
                  <Button onClick={onBack} variant="outline">
                   <FiArrowLeft className="mr-2" /> Back
                 </Button>
              </div>
           </Card>
         );
      }

      // --- Render the main component content using combinedData ---
      console.log("[RENDER] Rendering main content with combinedData:", combinedData);
      const displayCurrency = combinedData.currencyCode || currency;

      const tabItems = [
        { id: 'historical', label: 'Historical' },
        { id: 'performance', label: 'Performance' },
        { id: 'forecasting', label: 'Forecasting' },
        { id: 'financials', label: 'Financials' },
        { id: 'filings', label: 'Filings/Research' },
      ];

      // --- Tab Content Components (Keep as before) ---
      const ForecastingContent = ({ data }: { data?: RecommendationTrend[] }) => { /* ... */ };
      const FinancialsContent = ({ data }: { data?: EarningsHistoryEntry[] }) => { /* ... */ };

      return (
        <div className="space-y-6">
          {/* Header (Adjust buttons based on context) */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button onClick={onBack} variant="ghost" size="sm" className="p-1">
                <FiArrowLeft className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{combinedData.name} ({combinedData.ticker})</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{combinedData.exchange} - {combinedData.type}</p>
              </div>
            </div>
             <div className="flex space-x-2">
                {/* Only show Edit/Remove buttons in watchlist context */}
                {context === 'watchlist' && (
                    <>
                        <Button variant="outline" size="sm" onClick={() => { setIsEditingNotes(true); setEditError(null); }}>
                            <FiEdit2 className="mr-1" /> Edit Notes/Target
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => onRemove(ticker)}>
                            <FiTrash2 className="mr-1" /> Remove
                        </Button>
                    </>
                )}
                 {/* Add specific portfolio actions here if needed later */}
            </div>
          </div>

          {/* Edit Notes/Target Section (Only show in watchlist context) */}
          {isEditingNotes && context === 'watchlist' && (
            <Card title="Edit Notes & Target Price">
                <div className="space-y-4 p-4">
                    <div>
                        <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                        <textarea
                            id="edit-notes"
                            rows={3}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Add your notes..."
                        />
                    </div>
                     <div>
                        <label htmlFor="edit-target" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Price ({displayCurrency})</label>
                        <input
                            id="edit-target"
                            type="number"
                            value={editTargetPrice}
                            onChange={(e) => setEditTargetPrice(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter target price (optional)"
                            min="0"
                            step="0.01"
                            aria-describedby="edit-target-error"
                        />
                        {editError && <p id="edit-target-error" className="mt-1 text-sm text-red-600">{editError}</p>}
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsEditingNotes(false)}>Cancel</Button>
                        <Button onClick={handleSaveNotesAndTarget}>Save</Button>
                    </div>
                </div>
            </Card>
          )}

          {/* Main Layout: Chart + Tabs on Left, Panels on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <InteractivePriceChart
                  ticker={ticker}
                  historicalData={combinedData.historicalData || []}
                  keyMetrics={combinedData.keyMetrics || {}}
                  yearlyHighLow={combinedData.yearlyHighLow || {}}
                  currency={displayCurrency}
                />
              </Card>
              <Card>
                <Tabs items={tabItems}>
                  {(activeTab) => (
                    <div className="p-4 min-h-[200px]">
                      {/* Render tab content based on activeTab.id */}
                      {activeTab.id === 'historical' && <div>Historical Data Table Placeholder...</div>}
                      {activeTab.id === 'performance' && <div>Performance Metrics Placeholder...</div>}
                      {activeTab.id === 'forecasting' && <ForecastingContent data={combinedData.recommendationTrend} />}
                      {activeTab.id === 'financials' && <FinancialsContent data={combinedData.earningsHistory} />}
                      {activeTab.id === 'filings' && <div>Filings/Research Placeholder... (Data source limited)</div>}
                    </div>
                  )}
                </Tabs>
              </Card>
            </div>

            {/* Right Column (Sidebar) */}
            <div className="lg:col-span-1 space-y-6">
              {/* Pass combinedData to panels */}
              <FastFactsPanel data={combinedData} currency={displayCurrency} />
              <CompanyInfoPanel data={combinedData} />
              {/* Pass recommendationTrend to AnalystScorecardPanel */}
              <AnalystScorecardPanel recommendationTrend={combinedData.recommendationTrend} />
              {/* Display user notes and target price (Only show in watchlist context) */}
               {context === 'watchlist' && (
                   <Card title="Your Notes & Target">
                       <div className="p-4 space-y-3 text-sm">
                            <div>
                               <dt className="text-gray-500 dark:text-gray-400 mb-1">Notes:</dt>
                               <dd className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                    {combinedData.notes || <span className="italic text-gray-400 dark:text-gray-500">No notes added.</span>}
                               </dd>
                            </div>
                            <div>
                                <dt className="text-gray-500 dark:text-gray-400 mb-1">Target Price:</dt>
                                <dd className="font-medium text-gray-900 dark:text-gray-100">
                                    {combinedData.targetPrice !== undefined && combinedData.targetPrice !== null
                                        ? formatCurrency(combinedData.targetPrice, displayCurrency)
                                        : <span className="italic text-gray-400 dark:text-gray-500">Not set.</span>}
                                     {combinedData.alertEnabled && combinedData.targetPrice !== undefined && (
                                        <span className="ml-2 text-xs text-blue-500">(Alert Enabled)</span>
                                     )}
                                </dd>
                            </div>
                       </div>
                   </Card>
               )}
            </div>
          </div>
        </div>
      );
    }
