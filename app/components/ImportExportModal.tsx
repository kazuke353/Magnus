import { useState, useRef, useEffect, useCallback } from "react";
import { FiUpload, FiDownload, FiCopy, FiX, FiCheck, FiAlertTriangle, FiClipboard, FiFileText } from "react-icons/fi";
import Button from "./Button";
import { PerformanceMetrics, PieData, PieInstrument } from "~/utils/portfolio/types"; // Import necessary types
import { formatCurrency, formatPercentage } from "~/utils/formatters"; // Import formatters

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
  format: 'json' | 'text',
  currency: string = 'USD'
): string => {
  if (!portfolioData) return format === 'json' ? '{}' : 'No data available.';

  const exportObj: any = {};

  // 1. Overall Summary
  if (selectedSections.includes('summary') && portfolioData.overallSummary?.overallSummary) {
    const summary = portfolioData.overallSummary.overallSummary;
    exportObj.summary = {
      totalInvested: summary.totalInvestedOverall,
      totalResult: summary.totalResultOverall,
      returnPercentage: summary.returnPercentageOverall,
      fetchDate: summary.fetchDate,
      // Add estimated dividend if available in allocationAnalysis
      estimatedAnnualDividend: portfolioData.allocationAnalysis?.estimatedAnnualDividend,
    };
  }

  // 2. Allocation Analysis
  if (selectedSections.includes('allocation') && portfolioData.allocationAnalysis) {
    exportObj.allocation = portfolioData.allocationAnalysis; // Export the raw analysis object
  }

  // 3. Holdings (All Instruments)
  if (selectedSections.includes('holdings') && portfolioData.portfolio) {
    const allInstruments: PieInstrument[] = portfolioData.portfolio.reduce(
      (acc: PieInstrument[], pie: PieData) => {
        // Exclude OverallSummary pseudo-pie if it exists
        if (pie.name !== "OverallSummary" && pie.instruments) {
          return acc.concat(pie.instruments);
        }
        return acc;
      },
      []
    );
    // Group by ticker for easier viewing/processing
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
          dividendYield: inst.dividendYield, // Assuming yield is consistent
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
     // Calculate weighted average performance if needed, or just keep one instance's perf data
    exportObj.holdings = Object.values(holdingsByTicker);
  }

  // --- Format Output ---
  if (format === 'json') {
    return JSON.stringify(exportObj, null, 2); // Pretty print JSON
  } else { // format === 'text'
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
         textOutput += `  - ${key}: ${value.percent ? value.percent.toFixed(2) + '%' : 'N/A'}\n`; // Display percentage
      });
      textOutput += "Difference:\n";
      Object.entries(exportObj.allocation.allocationDifferences || {}).forEach(([key, value]) => {
        textOutput += `  - ${key}: ${value}\n`;
      });
      textOutput += "\n";
    }

    if (exportObj.holdings && exportObj.holdings.length > 0) {
      textOutput += "** Holdings Summary **\n";
      exportObj.holdings.forEach((holding: any) => {
        textOutput += `- ${holding.name} (${holding.ticker})\n`;
        textOutput += `  Quantity: ${holding.totalQuantity.toFixed(4)}\n`;
        textOutput += `  Invested: ${formatCurrency(holding.totalInvested, currency)}\n`;
        textOutput += `  Current Value: ${formatCurrency(holding.totalCurrentValue, currency)}\n`;
        textOutput += `  Result: ${formatCurrency(holding.totalResult, currency)}\n`;
        if (holding.dividendYield !== undefined) {
          textOutput += `  Dividend Yield: ${formatPercentage(holding.dividendYield)}\n`;
        }
         // Add performance if available
         if (holding.performance_1day !== null) textOutput += `  1D Perf: ${formatPercentage(holding.performance_1day)}\n`;
         if (holding.performance_1week !== null) textOutput += `  1W Perf: ${formatPercentage(holding.performance_1week)}\n`;
         if (holding.performance_1month !== null) textOutput += `  1M Perf: ${formatPercentage(holding.performance_1month)}\n`;
         if (holding.performance_1year !== null) textOutput += `  1Y Perf: ${formatPercentage(holding.performance_1year)}\n`;
        textOutput += "\n";
      });
    }

    return textOutput;
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
  const [selectedSections, setSelectedSections] = useState<string[]>(['summary', 'allocation', 'holdings']);
  const [exportFormat, setExportFormat] = useState<'json' | 'text'>('json');
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
    // ... (parsing logic remains the same) ...
     try {
      // Split by lines and filter out empty lines
      const lines = csvText.split('\n').filter(line => line.trim() !== '');

      if (lines.length < 2) {
        throw new Error("CSV file must contain at least a header row and one data row");
      }

      // Parse header row
      const headerRow = lines[0];
      // Handle quoted headers by splitting on "," but respecting quotes
      const headers = headerRow.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleanHeaders = headers.map(h => h.replace(/^"|"$/g, ''));

      // Find the total row (usually starts with "Total")
      const totalRowIndex = lines.findIndex(line => line.startsWith('"Total"'));

      if (totalRowIndex === -1) {
        throw new Error("Could not find the Total row in the CSV");
      }

      // Parse the total row to get pie name and allocation
      const totalRow = lines[totalRowIndex];
      const totalRowParts = totalRow.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleanTotalRow = totalRowParts.map(part => part.replace(/^"|"$/g, ''));

      // Extract pie name and allocation percentage
      const pieNameWithAllocation = cleanTotalRow[1]; // e.g., "REIT (30%)"
      const pieNameMatch = pieNameWithAllocation.match(/(.*)\s+\((\d+)%\)/);

      if (!pieNameMatch) {
        throw new Error("Could not parse pie name and allocation percentage");
      }

      const pieName = pieNameMatch[1];
      const allocationPercentage = parseInt(pieNameMatch[2], 10);

      // Parse instrument rows (all rows between header and total)
      const instrumentRows = lines.slice(1, totalRowIndex);
      const instruments = instrumentRows.map(row => {
        const rowParts = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const cleanRowParts = rowParts.map(part => part.replace(/^"|"$/g, ''));

        const instrument: Record<string, any> = {};
        cleanHeaders.forEach((header, index) => {
          if (index < cleanRowParts.length) {
            // Convert numeric values
            if (["Invested value", "Value", "Result", "Owned quantity"].includes(header)) {
              instrument[header] = cleanRowParts[index] === "N/A" ? null : parseFloat(cleanRowParts[index]);
            } else {
              instrument[header] = cleanRowParts[index] === "N/A" ? null : cleanRowParts[index];
            }
          }
        });

        return instrument;
      });

      // Extract summary data from total row
      const summary = {
        totalInvested: parseFloat(cleanTotalRow[2]),
        totalValue: parseFloat(cleanTotalRow[3]),
        totalResult: parseFloat(cleanTotalRow[4]),
        dividendsGained: cleanTotalRow[6] === "N/A" ? 0 : parseFloat(cleanTotalRow[6]),
        dividendsCash: cleanTotalRow[7] === "N/A" ? 0 : parseFloat(cleanTotalRow[7]),
        dividendsReinvested: cleanTotalRow[8] === "N/A" ? 0 : parseFloat(cleanTotalRow[8])
      };

      // Construct the final pie data
      const pieData = {
        name: pieName,
        allocation: allocationPercentage,
        summary,
        instruments
      };

      return pieData;
    } catch (error) {
      console.error("Error parsing Trading 212 CSV:", error);
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
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
      setParseError("Failed to copy data to clipboard."); // Use parseError state for feedback
    }
  }, [exportData]);

  const handleDownloadFile = useCallback(() => {
    const fileExtension = exportFormat === 'json' ? 'json' : 'txt';
    const mimeType = exportFormat === 'json' ? 'application/json' : 'text/plain';
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
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out transform"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Import / Export Portfolio
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`py-3 px-4 flex-1 text-center ${
              activeTab === "import"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            } transition-colors`}
            onClick={() => setActiveTab("import")}
          >
            <FiUpload className="inline-block mr-2" />
            Import (Trading 212 CSV)
          </button>
          <button
            className={`py-3 px-4 flex-1 text-center ${
              activeTab === "export"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            } transition-colors`}
            onClick={() => setActiveTab("export")}
          >
            <FiDownload className="inline-block mr-2" />
            Export Data
          </button>
        </div>

        <div className="p-6"> {/* Increased padding */}
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
                />
                <FiUpload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Upload a Trading 212 Pie CSV file
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                  CSV should contain pie data exported from Trading 212
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
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md">
                  <div className="flex">
                    <FiAlertTriangle className="h-5 w-5 text-red-500 mr-2" />
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
                <div className="space-y-2">
                  {['summary', 'allocation', 'holdings'].map((section) => (
                    <label key={section} className="flex items-center">
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
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">JSON (for LLMs)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="text"
                      checked={exportFormat === 'text'}
                      onChange={() => setExportFormat('text')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Plain Text</span>
                  </label>
                </div>
              </div>

              {/* Preview Area (Optional but helpful) */}
              <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   Preview:
                 </label>
                 <textarea
                   readOnly
                   value={exportData}
                   rows={6}
                   className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-xs font-mono"
                   placeholder="Select sections and format to see preview..."
                 />
              </div>

              {/* Error Message Area */}
              {parseError && (
                <div className="text-red-600 dark:text-red-400 text-sm">
                  {parseError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={handleCopyToClipboard}
                  disabled={!exportData}
                >
                  {copied ? (
                    <>
                      <FiCheck className="mr-2 text-green-500" /> Copied!
                    </>
                  ) : (
                    <>
                      <FiClipboard className="mr-2" /> Copy to Clipboard
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDownloadFile}
                  disabled={!exportData}
                >
                  <FiFileText className="mr-2" /> Download File
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
