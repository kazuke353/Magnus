import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import { FiArrowLeft, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Button from './Button';
import Card from './Card';
import Tabs from './Tabs';
import InteractivePriceChart from './InteractivePriceChart';
import FastFactsPanel from './FastFactsPanel';
import CompanyInfoPanel from './CompanyInfoPanel';
import AnalystScorecardPanel from './AnalystScorecardPanel';
import LoadingIndicator from './LoadingIndicator';
import { WatchlistItem, InstrumentMetadata } from '~/utils/portfolio/types'; // Import types

// Mock data for fallback/initial structure - will be replaced by API data
const mockDetailedData = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  exchange: 'NASDAQ',
  type: 'Equity',
  currentPrice: 175.20,
  currency: 'USD',
  previousClose: 174.50,
  blendedPE: 28.5,
  epsValuation: 180.00,
  dividendYield: 0.55,
  gicsSubIndustry: 'Technology Hardware, Storage & Peripherals',
  domicile: 'United States',
  marketCap: 2.7e12,
  spCreditRating: 'AA+',
  ltDebtCapital: 35.2,
  trxVolume: 55e6,
  spxRelated: 'Included',
  analystScorecard: {
    overallBeatPercent: 75,
    oneYearStats: { beat: 10, miss: 2, push: 1 },
    twoYearStats: { beat: 18, miss: 4, push: 2 },
  },
  historicalData: [
    { date: '2023-01-01', close: 130, earnings: 4.50, dividend: 0.20 },
    { date: '2023-04-01', close: 160, earnings: 4.80, dividend: 0.21 },
    { date: '2023-07-01', close: 180, earnings: 5.10, dividend: 0.22 },
    { date: '2023-10-01', close: 170, earnings: 5.00, dividend: 0.23 },
    { date: '2024-01-01', close: 190, earnings: 5.50, dividend: 0.24 },
    { date: '2024-04-01', close: 175, earnings: 5.30, dividend: 0.25 },
  ],
  keyMetrics: {
    'FY21': { eps: 5.61, pe: 25.0 },
    'FY22': { eps: 6.11, pe: 28.0 },
    'FY23': { eps: 5.90, pe: 29.0 },
    'FY24E': { eps: 6.50, pe: 27.0 },
    'FY25E': { eps: 7.10, pe: 25.0 },
    'FY26E': { eps: 7.80, pe: 23.0 },
    'FY27E': { eps: 8.50, pe: 21.0 },
  },
  yearlyHighLow: {
    '2021': { high: 150, low: 110 },
    '2022': { high: 180, low: 125 },
    '2023': { high: 195, low: 165 },
  },
  notes: "Looking for entry point below $170.", // Note: Notes/Target come from watchlist, not instrument API
  targetPrice: 195.00,
  alertEnabled: true,
};
// --- End Mock Data ---

interface WatchlistItemDetailProps {
  ticker: string;
  currency: string; // User's display currency
  onBack: () => void;
  onRemove: (ticker: string) => void;
  onUpdate: (ticker: string, updates: Partial<WatchlistItem>) => void;
}

// Define a type for the fetched instrument data
interface FetchedInstrumentData extends InstrumentMetadata {
    // Add fields from mock data that are NOT part of InstrumentMetadata if needed
    // For now, assume InstrumentMetadata covers most, and notes/target come from watchlist item itself
    analystScorecard?: any; // Use 'any' for mock flexibility
    historicalData?: any[];
    keyMetrics?: any;
    yearlyHighLow?: any;
    // Fields from WatchlistItem itself (passed separately or fetched)
    notes?: string;
    targetPrice?: number;
    alertEnabled?: boolean;
}

export default function WatchlistItemDetail({
  ticker,
  currency,
  onBack,
  onRemove,
  onUpdate
}: WatchlistItemDetailProps) {
  // State to hold the combined data (API details + watchlist specific fields)
  const [itemData, setItemData] = useState<FetchedInstrumentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editTargetPrice, setEditTargetPrice] = useState('');

  // Fetcher for instrument details
  const instrumentFetcher = useFetcher<{ instrument: InstrumentMetadata, error?: string }>();
  // Fetcher for watchlist item data (to get notes, targetPrice)
  const watchlistFetcher = useFetcher<{ watchlist: WatchlistItem[] }>(); // Assuming API returns the list

  // Fetch instrument details when ticker changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setItemData(null); // Clear previous data

    // Fetch instrument details from API
    instrumentFetcher.load(`/api/portfolio/instruments/${ticker}`);

    // Fetch the specific watchlist item data (or the whole list and filter)
    // This is needed to get notes/targetPrice which aren't part of general instrument details
    // Adjust the endpoint if you have one for a single watchlist item
    watchlistFetcher.load('/api/portfolio/watchlist');

  }, [ticker]); // Re-run when ticker changes

  // Process fetched data
  useEffect(() => {
    // Check if both fetchers are idle and have returned data
    if (instrumentFetcher.state === 'idle' && watchlistFetcher.state === 'idle') {
      const instrumentResult = instrumentFetcher.data;
      const watchlistResult = watchlistFetcher.data;

      if (instrumentResult?.error) {
        setError(instrumentResult.error || `Details not found for ticker: ${ticker}`);
        setItemData(null);
      } else if (instrumentResult?.instrument) {
        // Find the corresponding watchlist item to get notes/target
        const watchlistItem = watchlistResult?.watchlist?.find(item => item.ticker === ticker);

        // Combine instrument details with watchlist-specific data
        const combinedData: FetchedInstrumentData = {
          ...instrumentResult.instrument,
          // Add mock data for fields not yet in API response (replace later)
          analystScorecard: mockDetailedData.analystScorecard,
          historicalData: mockDetailedData.historicalData,
          keyMetrics: mockDetailedData.keyMetrics,
          yearlyHighLow: mockDetailedData.yearlyHighLow,
          // Add notes/target from the specific watchlist item
          notes: watchlistItem?.notes,
          targetPrice: watchlistItem?.targetPrice,
          alertEnabled: watchlistItem?.alertEnabled,
        };

        setItemData(combinedData);
        setEditNotes(watchlistItem?.notes || '');
        setEditTargetPrice(watchlistItem?.targetPrice?.toString() || '');
        setError(null); // Clear previous errors
      } else {
         // Handle case where instrument data is missing but no explicit error
         setError(`Details not found for ticker: ${ticker}`);
         setItemData(null);
      }
      setIsLoading(false); // Loading finished
    } else {
       // One or both fetchers are still loading
       setIsLoading(true);
    }
  }, [instrumentFetcher.state, instrumentFetcher.data, watchlistFetcher.state, watchlistFetcher.data, ticker]);


  const handleSaveNotesAndTarget = () => {
    const updates: Partial<WatchlistItem> = {
      notes: editNotes || undefined,
    };
    const parsedPrice = parseFloat(editTargetPrice);
    if (!isNaN(parsedPrice)) {
      updates.targetPrice = parsedPrice;
      updates.alertEnabled = true; // Automatically enable alert when target is set
    } else {
      updates.targetPrice = undefined;
      updates.alertEnabled = false; // Disable alert if target is cleared
    }
    onUpdate(ticker, updates);
    setIsEditingNotes(false);
    // Optimistically update local state for notes/target
    setItemData(prev => prev ? { ...prev, ...updates } : null);
  };


  if (isLoading) {
    return <LoadingIndicator message={`Loading details for ${ticker}...`} />;
  }

  if (error) {
    return (
      <Card>
        <p className="p-4 text-red-600 dark:text-red-400">{error}</p>
        <Button onClick={onBack} variant="outline">
          <FiArrowLeft className="mr-2" /> Back to Watchlist
        </Button>
      </Card>
    );
  }

  if (!itemData) {
    // This case might occur if API returns success but no instrument data
    return (
      <Card>
        <p className="p-4 text-gray-500 dark:text-gray-400">No data available for {ticker}.</p>
         <Button onClick={onBack} variant="outline">
          <FiArrowLeft className="mr-2" /> Back to Watchlist
        </Button>
      </Card>
    );
  }

  // Use the actual currency from the fetched instrument data if available, else fallback
  const displayCurrency = itemData.currencyCode || currency;

  const tabItems = [
    { id: 'historical', label: 'Historical' },
    { id: 'performance', label: 'Performance' },
    { id: 'forecasting', label: 'Forecasting' },
    { id: 'financials', label: 'Financials' },
    { id: 'filings', label: 'Filings/Research' },
    // { id: 'fun', label: 'Fun Graphics' }, // Add if needed
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button onClick={onBack} variant="ghost" size="sm" className="p-1">
            <FiArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            {/* Use itemData for display */}
            <h1 className="text-2xl font-bold">{itemData.name} ({itemData.ticker})</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{itemData.exchange} - {itemData.type}</p>
          </div>
        </div>
         <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(true)}>
                <FiEdit2 className="mr-1" /> Edit Notes/Target
            </Button>
            <Button variant="danger" size="sm" onClick={() => onRemove(ticker)}>
                <FiTrash2 className="mr-1" /> Remove
            </Button>
        </div>
      </div>

      {/* Edit Notes/Target Section */}
      {isEditingNotes && (
        <Card title="Edit Notes & Target Price">
            <div className="space-y-4 p-4">
                <div>
                    <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                    <textarea
                        id="edit-notes"
                        rows={3}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
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
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Enter target price"
                        min="0"
                        step="0.01"
                    />
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
          {/* Interactive Chart - Pass data from itemData */}
          <Card>
            <InteractivePriceChart
              ticker={ticker}
              historicalData={itemData.historicalData || []} // Pass actual or empty array
              keyMetrics={itemData.keyMetrics || {}}
              yearlyHighLow={itemData.yearlyHighLow || {}}
              currency={displayCurrency}
            />
          </Card>

          {/* Tabs */}
          <Card>
            <Tabs items={tabItems}>
              {(activeTab) => (
                <div className="p-4 min-h-[200px]">
                  {/* Render tab content based on activeTab.id */}
                  {activeTab.id === 'historical' && <div>Historical Data Content for {ticker}...</div>}
                  {activeTab.id === 'performance' && <div>Performance Metrics Content for {ticker}...</div>}
                  {activeTab.id === 'forecasting' && <div>Forecasting Content for {ticker}...</div>}
                  {activeTab.id === 'financials' && <div>Financials Content for {ticker}...</div>}
                  {activeTab.id === 'filings' && <div>Filings/Research Content for {ticker}...</div>}
                  {/* Add other tab content placeholders */}
                </div>
              )}
            </Tabs>
          </Card>
        </div>

        {/* Right Column (Sidebar) - Pass data from itemData */}
        <div className="lg:col-span-1 space-y-6">
          <FastFactsPanel data={itemData} currency={displayCurrency} />
          <CompanyInfoPanel data={itemData} />
          <AnalystScorecardPanel data={itemData.analystScorecard} />
        </div>
      </div>
    </div>
  );
}
