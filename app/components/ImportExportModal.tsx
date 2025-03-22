import { useState, useRef } from "react";
import { FiUpload, FiDownload, FiCopy, FiX, FiCheck, FiAlertTriangle } from "react-icons/fi";
import Button from "./Button";
import Card from "./Card";

interface ImportExportModalProps {
  onClose: () => void;
  onImport: (data: any) => void;
  portfolioData: any;
  isImporting: boolean;
}

export default function ImportExportModal({
  onClose,
  onImport,
  portfolioData,
  isImporting
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
      setParseError(null);
    }
  };

  const parseTrading212CSV = (csvText: string) => {
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

  const handleExportJSON = () => {
    if (!portfolioData) return;

    const dataStr = JSON.stringify(portfolioData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileName = `portfolio_export_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  };

  const handleCopyToClipboard = async () => {
    if (!portfolioData) return;

    try {
      const dataStr = JSON.stringify(portfolioData, null, 2);
      await navigator.clipboard.writeText(dataStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {activeTab === "import" ? "Import Portfolio" : "Export Portfolio"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            className={`py-2 px-4 ${
              activeTab === "import"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => setActiveTab("import")}
          >
            <FiUpload className="inline-block mr-2" />
            Import
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === "export"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => setActiveTab("export")}
          >
            <FiDownload className="inline-block mr-2" />
            Export
          </button>
        </div>

        {activeTab === "import" ? (
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
              <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border-l-4 border-red-500 p-4 rounded">
                <div className="flex">
                  <FiAlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-sm text-red-700 dark:text-red-400">{parseError}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
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
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Export your portfolio data as a JSON file or copy it to your clipboard.
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button onClick={handleExportJSON}>
                  <FiDownload className="mr-2" />
                  Download JSON
                </Button>
                <Button variant="outline" onClick={handleCopyToClipboard}>
                  {copied ? (
                    <>
                      <FiCheck className="mr-2 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <FiCopy className="mr-2" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
