import { useMemo } from 'react';
import Card from './Card';
import Button from './Button';
import { FiRefreshCw } from 'react-icons/fi';

interface AllocationData {
  targetAllocation: Record<string, string>;
  currentAllocation: Record<string, string>;
  allocationDifferences: Record<string, string>;
}

interface PortfolioAllocationAnalysisProps {
  allocationData: AllocationData;
  onRebalanceClick?: () => void;
  className?: string;
}

export default function PortfolioAllocationAnalysis({
  allocationData,
  onRebalanceClick,
  className = ""
}: PortfolioAllocationAnalysisProps) {
  if (!allocationData) {
    return (
      <Card className={`shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6 ${className}`}>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Allocation Analysis</h2>
        <div className="text-gray-500 dark:text-gray-400">
          No allocation data available.
        </div>
      </Card>
    );
  }

  return (
    <Card className={`shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6 ${className}`}>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Allocation Analysis</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Target Allocation</h3>
          <div className="space-y-2">
            {Object.entries(allocationData.targetAllocation).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">{key}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Current Allocation</h3>
          <div className="space-y-2">
            {Object.entries(allocationData.currentAllocation).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">{key}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Allocation Differences</h3>
          <div className="space-y-2">
            {Object.entries(allocationData.allocationDifferences).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">{key}</span>
                <span className={`font-medium ${value.startsWith('-') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {onRebalanceClick && (
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              onClick={onRebalanceClick}
              className="w-full"
            >
              <FiRefreshCw className="mr-2" />
              Rebalance Portfolio
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
