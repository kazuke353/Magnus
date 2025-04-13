import { useState, useRef, useEffect, useCallback } from "react";
import { FiUpload, FiDownload, FiCopy, FiX, FiCheck, FiAlertTriangle, FiClipboard, FiFileText, FiInfo, FiLoader } from "react-icons/fi"; // Added FiLoader
import Button from "./Button";
import { PerformanceMetrics, PieData, PieInstrument, FetchedInstrumentDetails, HistoricalDataPoint } from "~/utils/portfolio/types"; // Import necessary types
import { formatCurrency, formatPercentage } from "~/utils/formatters"; // Import formatters
import Tooltip from "./Tooltip"; // Import Tooltip
import { showToast } from "./ToastContainer"; // Import showToast

interface ImportExportModalProps {
  onClose: () => void;
  onImport: (data: any) => void;
  portfolioData: PerformanceMetrics | null; // Use the correct type
  isImporting: boolean;
  currency?: string; // Add currency for formatting exports
}

// --- Helper Function to Limit Historical Data ---
const limitHistoricalData = (
  details: FetchedInstrumentDetails,
  maxPoints: number = 30 // Default to last 30 points (e.g., days)
): FetchedInstrumentDetails => {
  if (details.historicalData && details.historicalData.length > maxPoints) {
    // Assuming data is sorted ascending by date
    return {
      ...details,
      historicalData: details.historicalData.slice(-maxPoints),
    };
  }
  return details;
};


// --- Helper Function to Prepare Export Data ---
const prepareExportData = (
  portfolioData: PerformanceMetrics | null,
  selectedSections: string[],
  format: 'json' | 'text' | 'csv',
  currency: string = 'USD',
  includePies: boolean, // New option
  detailedHoldingsData?: Record<string, FetchedInstrumentDetails> | null // Optional detailed data
): string => {
  if (!portfolioData) return format === 'json' ? '{}' : (format === 'csv' ? '' : 'No data available.');

  const exportObj: any = {};
  const allPies = portfolioData.portfolio || [];
  const userPies = includePies ? allPies.filter(p => p.name !== "OverallSummary") : []; // Filter based on option

  // 1. Overall Summary (Always included if selected)
  if (selectedSections.includes('summary') && portfolioData.overallSummary?.overallSummary) {
    const summary = portfolioData.overallSummary.overallSummary;
    exportObj.summary = {
      totalInvested: summary.totalInvestedOverall,
      totalResult: summary.totalResultOverall,
      returnPercentage: summary.returnPercentageOverall,
      fetchDate: summary.fetchDate,
      estimatedAnnualDividend: portfolioData.allocationAnalysis?.estimatedAnnualDividend,
    };
  }

  // 2. Allocation Analysis (Always included if selected)
  if (selectedSections.includes('allocation') && portfolioData.allocationAnalysis) {
    exportObj.allocation = portfolioData.allocationAnalysis;
  }

  // 3. Individual Pie Summaries (Conditionally included)
  if (includePies && selectedSections.includes('pies') && userPies.length > 0) {
    exportObj.pies = userPies.map(pie => ({
      name: pie.name,
      targetAllocation: pie.targetAllocation,
      totalInvested: pie.totalInvested,
      totalResult: pie.totalResult,
      returnPercentage: pie.returnPercentage,
      instrumentCount: pie.instruments?.length || 0,
      // Optionally include instruments within pies if needed, but might be redundant with holdings
      // instruments: pie.instruments // Uncomment if needed
    }));
  }

  // 4. Holdings (Detailed or Aggregated)
  if (selectedSections.includes('holdings') && allPies.length > 0) {
    if (detailedHoldingsData) {
      // Use provided detailed data
      exportObj.holdings = Object.values(detailedHoldingsData);
    } else {
      // Generate aggregated summary
      const allInstruments: PieInstrument[] = allPies.reduce(
        (acc: PieInstrument[], pie: PieData) => acc.concat(pie.instruments || []),
        []
      );

      const holdingsByTicker: Record<string, any> = {};
      allInstruments.forEach(inst => {
        if (!holdingsByTicker[inst.ticker]) {
          holdingsByTicker[inst.ticker] = {
            ticker: inst.ticker,
            name: inst.fullName || inst.ticker,
            type: inst.type,
            currency: inst.currencyCode,
            totalQuantity: 0,
            totalInvested: 0,
            totalCurrentValue: 0,
            totalResult: 0,
            dividendYield: inst.dividendYield,
            performance_1day: inst.performance_1day,
            performance_1week: inst.performance_1week,
            performance_1month: inst.performance_1month,
            performance_3months: inst.performance_3months,
            performance_1year: inst.performance_1year,
          };
        }
        holdingsByTicker[inst.ticker].totalQuantity += inst.ownedQuantity;
        holdingsByTicker[inst.ticker].totalInvested += inst.investedValue;
        holdingsByTicker[inst.ticker].totalCurrentValue += inst.currentValue;
        holdingsByTicker[inst.ticker].totalResult += inst.resultValue;
      });
      exportObj.holdings = Object.values(holdingsByTicker);
    }
  }

  // --- Format Output ---
  if (format === 'json') {
    return JSON.stringify(exportObj, null, 2);
  } else if (format === 'text') {
    let textOutput = `Portfolio Export (${new Date().toLocaleString()})\n`;
    textOutput += "========================================\n\n";

    if (exportObj.summary) {
      textOutput += "** Portfolio Summary **\n";
      textOutput += `Total Invested: ${formatCurrency(exportObj.summary.totalInvested, currency)}\n`;
      textOutput += `Total Result: ${formatCurrency(exportObj.summary.totalResult, currency)} (${formatPercentage(exportObj.summary.returnPercentage)})\n`;
      if (exportObj.summary.estimatedAnnualDividend !== undefined) {
        textOutput += `Est. Annual Dividend: ${formatCurrency(exportObj.summary.estimatedAnnualDividend, currency)}\n`;
      }
      textOutput += `Last Updated: ${exportObj.summary.fetchDate}\n\n`;
    }

    if (exportObj.allocation) {
      textOutput += "** Allocation Analysis **\n";
      textOutput += "Target:\n";
      Object.entries(exportObj.allocation.targetAllocation || {}).forEach(([key, value]) => {
        textOutput += `  - ${key}: ${value}\n`;
      });
      textOutput += "Current:\n";
      Object.entries(exportObj.allocation.currentAllocation || {}).forEach(([key, value]) => {
        textOutput += `  - ${key}: ${value.percent ? value.percent.toFixed(2) + '%' : 'N/A'}\n`;
      });
      textOutput += "Difference:\n";
      Object.entries(exportObj.allocation.allocationDifferences || {}).forEach(([key, value]) => {
        textOutput += `  - ${key}: ${value}\n`;
      });
      textOutput += "\n";
    }

    if (exportObj.pies && exportObj.pies.length > 0) {
      textOutput += "** Pie Summaries **\n";
      exportObj.pies.forEach((pie: any) => {
        textOutput += `- ${pie.name}\n`;
        if (pie.targetAllocation !== undefined) {
          textOutput += `  Target Allocation: ${formatPercentage(pie.targetAllocation)}\n`;
        }
        textOutput += `  Invested: ${formatCurrency(pie.totalInvested, currency)}\n`;
        textOutput += `  Result: ${formatCurrency(pie.totalResult, currency)} (${formatPercentage(pie.returnPercentage)})\n`;
        textOutput += `  Instruments: ${pie.instrumentCount}\n\n`;
      });
    }

    if (exportObj.holdings && exportObj.holdings.length > 0) {
      textOutput += `** Holdings ${detailedHoldingsData ? '(Detailed)' : '(Aggregated Summary)'} **\n`;
      exportObj.holdings.forEach((holding: any) => {
        textOutput += `- ${holding.name} (${holding.ticker})\n`;
        textOutput += `  Type: ${holding.type}\n`;
        // Show aggregated or detailed data
        if (detailedHoldingsData) {
          textOutput += `  Currency: ${holding.currencyCode}\n`;
          textOutput += `  Current Price: ${formatCurrency(holding.currentPrice, holding.currencyCode)}\n`;
          textOutput += `  Market Cap: ${holding.marketCap ? formatCurrency(holding.marketCap, holding.currencyCode, 0) : 'N/A'}\n`;
          textOutput += `  P/E Ratio: ${holding.peRatio ? holding.peRatio.toFixed(2) : 'N/A'}\n`;
          textOutput += `  Dividend Yield: ${holding.dividendYield ? formatPercentage(holding.dividendYield) : 'N/A'}\n`;
          textOutput += `  Sector: ${holding.sector || 'N/A'}\n`;
          textOutput += `  Industry: ${holding.industry || 'N/A'}\n`;
          if (holding.historicalData && holding.historicalData.length > 0) {
            textOutput += `  Historical Data Points: ${holding.historicalData.length}\n`;
          }
        } else {
          textOutput += `  Quantity: ${holding.totalQuantity.toFixed(4)}\n`;
          textOutput += `  Invested: ${formatCurrency(holding.totalInvested, currency)}\n`;
          textOutput += `  Current Value: ${formatCurrency(holding.totalCurrentValue, currency)}\n`;
          textOutput += `  Result: ${formatCurrency(holding.totalResult, currency)}\n`;
          if (holding.dividendYield !== undefined) {
            textOutput += `  Dividend Yield: ${formatPercentage(holding.dividendYield)}\n`;
          }
          if (holding.performance_1day !== null) textOutput += `  1D Perf: ${formatPercentage(holding.performance_1day)}\n`;
          if (holding.performance_1week !== null) textOutput += `  1W Perf: ${formatPercentage(holding.performance_1week)}\n`;
          if (holding.performance_1month !== null) textOutput += `  1M Perf: ${formatPercentage(holding.performance_1month)}\n`;
          if (holding.performance_1year !== null) textOutput += `  1Y Perf: ${formatPercentage(holding.performance_1year)}\n`;
        }
        textOutput += "\n";
      });
    }

    return textOutput;
  } else { // format === 'csv'
    // CSV Export remains aggregated holdings only
    let csvOutput = '';
    const headers = [
      "Ticker", "Name", "Type", "Currency", "Quantity",
      "Invested Value", "Current Value", "Result", "Dividend Yield (%)",
      "Perf 1D (%)", "Perf 1W (%)", "Perf 1M (%)", "Perf 3M (%)", "Perf 1Y (%)"
    ];
    csvOutput += headers.join(',') + '\n';

    // Generate aggregated summary for CSV regardless of detailedHoldingsData
    const allInstruments: PieInstrument[] = allPies.reduce(
      (acc: PieInstrument[], pie: PieData) => acc.concat(pie.instruments || []),
      []
    );
    const holdingsByTicker: Record<string, any> = {};
    allInstruments.forEach(inst => {
      if (!holdingsByTicker[inst.ticker]) {
        holdingsByTicker[inst.ticker] = {
          ticker: inst.ticker, name: inst.fullName || inst.ticker, type: inst.type,
          currency: inst.currencyCode, totalQuantity: 0, totalInvested: 0,
          totalCurrentValue: 0, totalResult: 0, dividendYield: inst.dividendYield,
          performance_1day: inst.performance_1day, performance_1week: inst.performance_1week,
          performance_1month: inst.performance_1month, performance_3months: inst.performance_3months,
          performance_1year: inst.performance_1year,
        };
      }
      holdingsByTicker[inst.ticker].totalQuantity += inst.ownedQuantity;
      holdingsByTicker[inst.ticker].totalInvested += inst.investedValue;
      holdingsByTicker[inst.ticker].totalCurrentValue += inst.currentValue;
      holdingsByTicker[inst.ticker].totalResult += inst.resultValue;
    });
    const aggregatedHoldings = Object.values(holdingsByTicker);

    if (aggregatedHoldings.length > 0) {
      aggregatedHoldings.forEach((holding: any) => {
        const row = [
          holding.ticker,
          `"${holding.name.replace(/"/g, '""')}"`,
          holding.type,
          holding.currency,
          holding.totalQuantity.toFixed(4),
          holding.totalInvested.toFixed(2),
          holding.totalCurrentValue.toFixed(2),
          holding.totalResult.toFixed(2),
          holding.dividendYield !== undefined ? holding.dividendYield.toFixed(2) : '',
          holding.performance_1day !== null ? holding.performance_1day.toFixed(2) : '',
          holding.performance_1week !== null ? holding.performance_1week.toFixed(2) : '',
          holding.performance_1month !== null ? holding.performance_1month.toFixed(2) : '',
          holding.performance_3months !== null ? holding.performance_3months.toFixed(2) : '',
          holding.performance_1year !== null ? holding.performance_1year.toFixed(2) : '',
        ];
        csvOutput += row.join(',') + '\n';
      });
    }
    return csvOutput;
  }
};


export default function ImportExportModal({
  onClose,
  onImport,
  portfolioData,
  isImporting,
  currency = 'USD' // Default currency
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // --- Export State ---
  const [selectedSections, setSelectedSections] = useState<string[]>(['summary', 'allocation', 'pies', 'holdings']);
  const [exportFormat, setExportFormat] = useState<'json' | 'text' | 'csv'>('json');
  const [exportData, setExportData] = useState<string>('');
  const [includePies, setIncludePies] = useState<boolean>(true); // New state for including pies
  const [includeDetails, setIncludeDetails] = useState<boolean>(false); // New state for including details
  const [isExportingDetails, setIsExportingDetails] = useState<boolean>(false); // Loading state for detail export

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);

  // --- Import Logic (remains the same) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };
  const parseTrading212CSV = (csvText: string) => { /* ... */ };
  const handleImport = async () => { /* ... */ };

  // --- Export Logic ---
  const handleSectionChange = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  // Update export data preview whenever selections change (excluding details)
  useEffect(() => {
    // Preview doesn't include fetched details, only aggregated
    const data = prepareExportData(portfolioData, selectedSections, exportFormat, currency, includePies, null);
    setExportData(data);
  }, [portfolioData, selectedSections, exportFormat, currency, includePies]); // Add includePies

  // --- NEW: Function to fetch detailed data ---
  const fetchAllHoldingDetails = async (): Promise<Record<string, FetchedInstrumentDetails> | null> => {
    if (!portfolioData?.portfolio) return null;
    setIsExportingDetails(true);
    setParseError(null); // Clear previous errors

    const uniqueTickers = Array.from(new Set(
      portfolioData.portfolio.flatMap(pie => pie.instruments?.map(inst => inst.ticker) || [])
    ));

    console.log("Fetching details for tickers:", uniqueTickers);
    const detailPromises = uniqueTickers.map(ticker =>
      fetch(`/api/instrument-details/${ticker}`)
        .then(res => {
          if (!res.ok) {
            return res.json().then(err => {
              console.warn(`Failed to fetch details for ${ticker}: ${res.status}`, err);
              return { ticker, error: err?.error || `HTTP ${res.status}` }; // Return error marker
            });
          }
          return res.json();
        })
        .then(data => ({ ticker, data: data?.instrument })) // Ensure we get the instrument object
        .catch(err => {
          console.error(`Network error fetching details for ${ticker}:`, err);
          return { ticker, error: 'Network Error' }; // Return error marker
        })
    );

    try {
      const results = await Promise.all(detailPromises);
      const successfulDetails: Record<string, FetchedInstrumentDetails> = {};
      let fetchErrors = 0;

      results.forEach(result => {
        if (result.data && !result.error) {
          // Limit historical data here
          successfulDetails[result.ticker] = limitHistoricalData(result.data, 30); // Limit to 30 points
        } else {
          fetchErrors++;
          console.warn(`Skipping details for ${result.ticker} due to error: ${result.error}`);
        }
      });

      if (fetchErrors > 0) {
        showToast({ type: 'warning', message: `Could not fetch details for ${fetchErrors} holdings.` });
      }
      if (Object.keys(successfulDetails).length === 0 && fetchErrors > 0) {
        throw new Error("Failed to fetch details for all holdings.");
      }

      return successfulDetails;
    } catch (error) {
      console.error("Error fetching all holding details:", error);
      setParseError(error instanceof Error ? error.message : "Failed to fetch holding details.");
      return null;
    } finally {
      setIsExportingDetails(false);
    }
  };

  // --- UPDATED Export Handlers ---
  const handleCopyToClipboard = useCallback(async () => {
    let dataToCopy = exportData; // Default to preview data
    if (includeDetails && exportFormat !== 'csv') {
      const detailedData = await fetchAllHoldingDetails();
      if (detailedData) {
        dataToCopy = prepareExportData(portfolioData, selectedSections, exportFormat, currency, includePies, detailedData);
      } else {
        return; // Error handled in fetchAllHoldingDetails
      }
    } else {
      // Use the already generated preview data if not including details or if CSV
      dataToCopy = prepareExportData(portfolioData, selectedSections, exportFormat, currency, includePies, null);
    }

    try {
      await navigator.clipboard.writeText(dataToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      setParseError("Failed to copy data to clipboard.");
    }
  }, [exportData, includeDetails, exportFormat, portfolioData, selectedSections, currency, includePies]);

  const handleDownloadFile = useCallback(async () => {
    let dataToDownload = exportData; // Default to preview data
    let finalExportFormat = exportFormat;

    if (includeDetails && exportFormat !== 'csv') {
      const detailedData = await fetchAllHoldingDetails();
      if (detailedData) {
        dataToDownload = prepareExportData(portfolioData, selectedSections, exportFormat, currency, includePies, detailedData);
      } else {
        return; // Error handled in fetchAllHoldingDetails
      }
    } else {
      // Use the already generated preview data if not including details or if CSV
      dataToDownload = prepareExportData(portfolioData, selectedSections, exportFormat, currency, includePies, null);
    }

    const fileExtension = finalExportFormat === 'json' ? 'json' : (finalExportFormat === 'csv' ? 'csv' : 'txt');
    const mimeType = finalExportFormat === 'json' ? 'application/json' : (finalExportFormat === 'csv' ? 'text/csv' : 'text/plain');
    const blob = new Blob([dataToDownload], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio_export_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportData, exportFormat, includeDetails, portfolioData, selectedSections, currency, includePies]);


  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out transform flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Import / Export Portfolio
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            className={`py-3 px-4 flex-1 text-center text-sm md:text-base ${activeTab === "import"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              } transition-colors`}
            onClick={() => setActiveTab("import")}
          >
            <FiUpload className="inline-block mr-1 md:mr-2" />
            Import (T212 CSV)
          </button>
          <button
            className={`py-3 px-4 flex-1 text-center text-sm md:text-base ${activeTab === "export"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              } transition-colors`}
            onClick={() => setActiveTab("export")}
          >
            <FiDownload className="inline-block mr-1 md:mr-2" />
            Export Data
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 overflow-y-auto">
          {activeTab === "import" ? (
            // --- Import Tab Content (Unchanged) ---
            <div className="space-y-4">
              {/* ... import form elements ... */}
            </div>
          ) : (
            // --- Export Tab Content ---
            <div className="space-y-6">
              {/* Section Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Sections to Export:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['summary', 'allocation', 'pies', 'holdings'].map((section) => (
                    <label key={section} className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(section)}
                        onChange={() => handleSectionChange(section)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">{section}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* NEW: Export Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Export Options:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                    <input
                      type="checkbox"
                      checked={includePies}
                      onChange={(e) => setIncludePies(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Include Pie Summaries</span>
                    <Tooltip content="Include a summary section for each individual pie in your portfolio.">
                      <FiInfo className="ml-1 text-gray-500" />
                    </Tooltip>
                  </label>
                  <label className={`flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${exportFormat === 'csv' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={includeDetails}
                      onChange={(e) => setIncludeDetails(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={exportFormat === 'csv'} // Disable for CSV
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Include Detailed Holding Data</span>
                    <Tooltip content="Fetch and include detailed data (sector, P/E, limited history, etc.) for each holding. Increases export time. Not available for CSV format.">
                      <FiInfo className="ml-1 text-gray-500" />
                    </Tooltip>
                  </label>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Export Format:
                </label>
                <div className="flex flex-wrap gap-2">
                  {/* JSON */}
                  <label className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                    <input type="radio" name="exportFormat" value="json" checked={exportFormat === 'json'} onChange={() => setExportFormat('json')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">JSON</span>
                    <Tooltip content="Machine-readable format. Supports detailed data."><FiInfo className="ml-1 text-gray-500" /></Tooltip>
                  </label>
                  {/* Text */}
                  <label className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                    <input type="radio" name="exportFormat" value="text" checked={exportFormat === 'text'} onChange={() => setExportFormat('text')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Plain Text</span>
                    <Tooltip content="Human-readable summary. Supports detailed data."><FiInfo className="ml-1 text-gray-500" /></Tooltip>
                  </label>
                  {/* CSV */}
                  <label className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                    <input type="radio" name="exportFormat" value="csv" checked={exportFormat === 'csv'} onChange={() => setExportFormat('csv')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">CSV</span>
                    <Tooltip content="Spreadsheet format (exports aggregated holdings summary only)."><FiInfo className="ml-1 text-gray-500" /></Tooltip>
                  </label>
                </div>
                {exportFormat === 'csv' && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Note: CSV format exports aggregated holdings summary only, regardless of detail option.</p>
                )}
              </div>

              {/* Preview Area */}
              <div>
                <label htmlFor="export-preview" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preview (Aggregated Data):
                </label>
                <textarea
                  id="export-preview"
                  readOnly
                  value={exportData} // Always shows aggregated preview
                  rows={8}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-xs font-mono resize-none"
                  placeholder="Select sections and format to see preview..."
                  aria-label="Export data preview"
                />
                {includeDetails && exportFormat !== 'csv' && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Note: Preview shows aggregated data. Full details will be fetched upon export.</p>
                )}
              </div>

              {/* Error Message Area */}
              {parseError && (
                <div role="alert" className="text-red-600 dark:text-red-400 text-sm">
                  {parseError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={handleCopyToClipboard}
                  disabled={isExportingDetails || !portfolioData}
                  isLoading={isExportingDetails && !copied}
                  aria-disabled={isExportingDetails || !portfolioData}
                >
                  {copied ? (
                    <>
                      <FiCheck className="mr-2 text-green-500" /> Copied!
                    </>
                  ) : isExportingDetails ? (
                    <>
                      <FiLoader className="animate-spin mr-2" /> Fetching...
                    </>
                  ) : (
                    <>
                      <FiClipboard className="mr-2" /> Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDownloadFile}
                  disabled={isExportingDetails || !portfolioData}
                  isLoading={isExportingDetails}
                  aria-disabled={isExportingDetails || !portfolioData}
                >
                  {isExportingDetails ? (
                    <>
                      <FiLoader className="animate-spin mr-2" /> Fetching...
                    </>
                  ) : (
                    <>
                      <FiFileText className="mr-2" /> Download
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
