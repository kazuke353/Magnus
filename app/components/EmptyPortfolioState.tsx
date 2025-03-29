import Card from "./Card";
import Button from "./Button";
import { FiBarChart, FiRefreshCw } from "react-icons/fi";

interface EmptyPortfolioStateProps {
  onRefresh: () => void;
  className?: string;
}

export default function EmptyPortfolioState({ onRefresh, className = "" }: EmptyPortfolioStateProps) {
  return (
    <Card className={className}>
      <div className="text-center py-8">
        <FiBarChart className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Portfolio Data Available</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          We couldn't find any portfolio data for your account.
        </p>
        <Button onClick={onRefresh}>
          <FiRefreshCw className="mr-2" />
          Refresh Data
        </Button>
      </div>
    </Card>
  );
}
