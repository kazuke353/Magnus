import Button from "./Button";
import { FiRefreshCw, FiUpload } from "react-icons/fi";

interface PortfolioHeaderProps {
  onRefresh: () => void;
  onImportExport: () => void;
  isRefreshing: boolean;
  className?: string;
}

export default function PortfolioHeader({
  onRefresh,
  onImportExport,
  isRefreshing,
  className = ""
}: PortfolioHeaderProps) {
  return (
    <div className={`flex justify-between items-center mb-4 ${className}`}>
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
          onClick={onImportExport}
          className="px-4 py-2 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <FiUpload className="mr-2" />
          Import/Export
        </Button>
        
        <Button
          onClick={onRefresh}
          isLoading={isRefreshing}
          className="px-4 py-2 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200"
          disabled={isRefreshing}
        >
          <FiRefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
    </div>
  );
}
