import { useState, useRef, useEffect, useCallback } from "react";
import { FiUpload, FiDownload, FiCopy, FiX, FiCheck, FiAlertTriangle, FiClipboard, FiFileText, FiInfo } from "react-icons/fi";
import Button from "./Button";
import { PerformanceMetrics, PieData, PieInstrument } from "~/utils/portfolio/types"; // Import necessary types
import { formatCurrency, formatPercentage } from "~/utils/formatters"; // Import formatters
import Tooltip from "./Tooltip"; // Import Tooltip

interface ImportExportModalProps {
  onClose: () => void;
  onImport: (data: any) => void;
  portfolioData: PerformanceMetrics | null; // Use the correct type
  isImporting: boolean;
  currency?: string; // Add currency for formatting exports
}

// --- Helper Function to Prepare Export Data ---
const prepareExportData = (
  portfolioData: PerformanceMetrics | null,
  selectedSections: string[],
  format: 'json' | 'text' | 'csv', // Added 'csv' format
  currency: string = 'USD'
): string => {
  if (!portfolioData) return format === 'json' ? '{}' : (format === 'csv' ? '' : 'No data available.');

  const exportObj: any = {};
  const pies = portfolioData.portfolio?.filter(p => p.name !== "OverallSummary") || [];

  // 1. Overall Summary
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

  // 2. Allocation Analysis
  if (selectedSections.includes('allocation') && portfolioData.allocationAnalysis) {
    exportObj.allocation = portfolioData.allocationAnalysis;
  }

  // 3. Individual Pie Summaries
  if (selectedSections.includes('pies') && pies.length > 0) {
    exportObj.pies = pies.map(pie => ({
      name: pie.name,
      targetAllocation: pie.targetAllocation,
      totalInvested: pie.totalInvested,
      totalResult: pie.totalResult,
      returnPercentage: pie.returnPercentage,
      instrumentCount: pie.instruments?.length || 0,
    }));
  }

  // 4. Holdings (All Instruments)
  if (selectedSections.includes('holdings') && pies.length > 0) {
    const allInstruments: PieInstrument[] = pies.reduce(
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
      textOutput += "** Holdings Summary (Aggregated) **\n";
      exportObj.holdings.forEach((holding: any) => {
        textOutput += `- ${holding.name} (${holding.ticker})\n`;
        textOutput += `  Type: ${holding.type}\n`;
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
        textOutput += "\n";
      });
    }

    return textOutput;
  } else { // format === 'csv'
    let csvOutput = '';
    const headers = [
      "Ticker", "Name", "Type", "Currency", "Quantity",
      "Invested Value", "Current Value", "Result", "Dividend Yield (%)",
      "Perf 1D (%)", "Perf 1W (%)", "Perf 1M (%)", "Perf 3M (%)", "Perf 1Y (%)"
    ];
    csvOutput += headers.join(',') + '\n';

    if (exportObj.holdings && exportObj.holdings.length > 0) {
      exportObj.holdings.forEach((holding: any) => {
        const row = [
          holding.ticker,
          `"${holding.name.replace(/"/g, '""')}"`, // Escape quotes in name
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
    // Note: CSV export currently only includes aggregated holdings.
    // Exporting summary/allocation/pies to CSV would require a different structure.
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
  const [selectedSections, setSelectedSections] = useState<string[]>(['summary', 'allocation', 'pies', 'holdings']); // Added 'pies'
  const [exportFormat, setExportFormat] = useState<'json' | 'text' | 'csv'>('json'); // Added 'csv'
  const [exportData, setExportData] = useState<string>('');

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  // --- Import Logic (remains mostly the same) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
      setParseError(null);
    }
  };

  const parseTrading212CSV = (csvText: string) => {
     try {
      const lines = csvText.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error("CSV must contain at least a header and one data row.");

      const headerRow = lines[0];
      const headers = headerRow.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(h => h.replace(/^"|"$/g, '')) || [];
      if (headers.length === 0) throw new Error("Could not parse CSV header.");

      const totalRowIndex = lines.findIndex(line => line.startsWith('"Total"'));
      if (totalRowIndex === -1) throw new Error("Could not find the 'Total' row in the CSV.");

      const totalRowParts = lines[totalRowIndex].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(part => part.replace(/^"|"$/g, '')) || [];
      if (totalRowParts.length < 5) throw new Error("Could not parse the 'Total' row correctly.");

      const pieNameWithAllocation = totalRowParts[1];
      const pieNameMatch = pieNameWithAllocation.match(/(.*)\s+\((\d+)%\)/);
      if (!pieNameMatch) throw new Error("Could not parse pie name and allocation percentage from 'Total' row.");

      const pieName = pieNameMatch[1];
      const allocationPercentage = parseInt(pieNameMatch[2], 10);

      const instrumentRows = lines.slice(1, totalRowIndex);
      const instruments = instrumentRows.map((row, rowIndex) => {
        const rowParts = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(part => part.replace(/^"|"$/g, '')) || [];
        const instrument: Record<string, any> = {};
        headers.forEach((header, index) => {
          if (index < rowParts.length) {
            const value = rowParts[index];
            if (["Invested value", "Value", "Result", "Owned quantity"].includes(header)) {
              instrument[header] = value === "N/A" ? null : parseFloat(value);
            } else {
              instrument[header] = value === "N/A" ? null : value;
            }
          }
        });
        // Basic validation for instrument row
        if (!instrument['Ticker'] || !instrument['Name']) {
            console.warn(`Skipping instrument row ${rowIndex + 2}: Missing Ticker or Name.`);
            return null; // Skip this instrument if essential data is missing
        }
        return instrument;
      }).filter(inst => inst !== null); // Filter out skipped instruments

      const summary = {
        totalInvested: parseFloat(totalRowParts[2]),
        totalValue: parseFloat(totalRowParts[3]),
        totalResult: parseFloat(totalRowParts[4]),
        dividendsGained: totalRowParts[6] === "N/A" ? 0 : parseFloat(totalRowParts[6]),
        dividendsCash: totalRowParts[7] === "N/A" ? 0 : parseFloat(totalRowParts[7]),
        dividendsReinvested: totalRowParts[8] === "N/A" ? 0 : parseFloat(totalRowParts[8])
      };

      return { name: pieName, allocation: allocationPercentage, summary, instruments };
    } catch (error) {
      console.error("Error parsing Trading 212 CSV:", error);
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}. Please ensure it's a valid Trading 212 pie export.`);
    }
  };

  const handleImport = async () => {
    if (!csvFile) {
      setParseError("Please select a CSV file to import");
      return;
    }

    try {
      const text = await csvFile.text();
      const pieData = parseTrading212CSV(text);
      onImport(pieData);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : String(error));
    }
  };

  // --- Export Logic ---
  const handleSectionChange = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Update export data whenever selections change
  useEffect(() => {
    const data = prepareExportData(portfolioData, selectedSections, exportFormat, currency);
    setExportData(data);
  }, [portfolioData, selectedSections, exportFormat, currency]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      setParseError("Failed to copy data to clipboard.");
    }
  }, [exportData]);

  const handleDownloadFile = useCallback(() => {
    const fileExtension = exportFormat === 'json' ? 'json' : (exportFormat === 'csv' ? 'csv' : 'txt');
    const mimeType = exportFormat === 'json' ? 'application/json' : (exportFormat === 'csv' ? 'text/csv' : 'text/plain');
    const blob = new Blob([exportData], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio_export_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportData, exportFormat]);

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
            className={`py-3 px-4 flex-1 text-center text-sm md:text-base ${
              activeTab === "import"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            } transition-colors`}
            onClick={() => setActiveTab("import")}
          >
            <FiUpload className="inline-block mr-1 md:mr-2" />
            Import (T212 CSV)
          </button>
          <button
            className={`py-3 px-4 flex-1 text-center text-sm md:text-base ${
              activeTab === "export"
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
            // --- Import Tab Content ---
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  ref={fileInputRef}
                  aria-labelledby="import-description"
                />
                <FiUpload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-2" />
                <p id="import-description" className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Upload a Trading 212 Pie CSV file
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                  Ensure the CSV contains data exported directly from a Trading 212 pie.
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="mb-2"
                >
                  Select CSV File
                </Button>
                {csvFile && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Selected file: {csvFile.name}
                  </p>
                )}
              </div>

              {parseError && (
                <div role="alert" className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md">
                  <div className="flex">
                    <FiAlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">{parseError}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  isLoading={isImporting}
                  disabled={!csvFile || isImporting}
                  aria-disabled={!csvFile || isImporting}
                >
                  <FiUpload className="mr-2" />
                  Import
                </Button>
              </div>
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

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Export Format:
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">JSON</span>
                     <Tooltip content="Best for machine readability (e.g., LLMs, scripts)">
                        <FiInfo className="ml-1 text-gray-500" />
                     </Tooltip>
                  </label>
                  <label className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="text"
                      checked={exportFormat === 'text'}
                      onChange={() => setExportFormat('text')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Plain Text</span>
                     <Tooltip content="Human-readable summary format">
                        <FiInfo className="ml-1 text-gray-500" />
                     </Tooltip>
                  </label>
                  <label className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">CSV</span>
                     <Tooltip content="Spreadsheet-compatible format (exports holdings only)">
                        <FiInfo className="ml-1 text-gray-500" />
                     </Tooltip>
                  </label>
                </div>
                 {exportFormat === 'csv' && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Note: CSV format currently exports aggregated holdings only.</p>
                 )}
              </div>

              {/* Preview Area */}
              <div>
                 <label htmlFor="export-preview" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   Preview:
                 </label>
                 <textarea
                   id="export-preview"
                   readOnly
                   value={exportData}
                   rows={8} // Increased rows for better preview
                   className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-xs font-mono resize-none"
                   placeholder="Select sections and format to see preview..."
                   aria-label="Export data preview"
                 />
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
                  disabled={!exportData}
                  aria-disabled={!exportData}
                >
                  {copied ? (
                    <>
                      <FiCheck className="mr-2 text-green-500" /> Copied!
                    </>
                  ) : (
                    <>
                      <FiClipboard className="mr-2" /> Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDownloadFile}
                  disabled={!exportData}
                  aria-disabled={!exportData}
                >
                  <FiFileText className="mr-2" /> Download
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
