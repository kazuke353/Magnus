import { useState, useMemo, useRef, useEffect } from 'react';
import { PerformanceMetrics } from '~/utils/portfolio_fetcher';
import Button from './Button';
import { FiX, FiArrowRight, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { formatCurrency } from '~/utils/formatters';

interface RebalanceModalProps {
  portfolioData: PerformanceMetrics;
  onClose: () => void;
  currency?: string;
}

export default function RebalanceModal({ 
  portfolioData, 
  onClose,
  currency = 'BGN'
}: RebalanceModalProps) {
  const [rebalanceAmount, setRebalanceAmount] = useState<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Calculate rebalance suggestions
  const rebalanceSuggestions = useMemo(() => {
    if (!portfolioData?.allocationAnalysis?.allocationDifferences || 
        !portfolioData?.overallSummary?.overallSummary?.totalInvestedOverall) {
      return [];
    }

    const totalInvested = portfolioData.overallSummary.overallSummary.totalInvestedOverall;
    const differences = portfolioData.allocationAnalysis.allocationDifferences;
    const currentAllocation = portfolioData.allocationAnalysis.currentAllocation;
    
    // Extract portfolio names and their current allocation percentages
    const portfolios = Object.keys(differences);
    const currentPercentages: Record<string, number> = {};
    
    for (const portfolio of portfolios) {
      const percentStr = currentAllocation[portfolio];
      const percentMatch = percentStr.match(/^(.*?)%$/);
      currentPercentages[portfolio] = percentMatch ? parseFloat(percentMatch[1]) : 0;
    }
    
    // Calculate target percentages
    const targetPercentages: Record<string, number> = {};
    for (const portfolio of portfolios) {
      const diffStr = differences[portfolio];
      const diffMatch = diffStr.match(/^([+-]?.*?)%$/);
      const diffValue = diffMatch ? parseFloat(diffMatch[1]) : 0;
      targetPercentages[portfolio] = currentPercentages[portfolio] + diffValue;
    }
    
    // Calculate current values
    const currentValues: Record<string, number> = {};
    for (const portfolio of portfolios) {
      currentValues[portfolio] = (currentPercentages[portfolio] / 100) * totalInvested;
    }
    
    // Calculate target values
    const targetValues: Record<string, number> = {};
    const totalWithRebalance = totalInvested + rebalanceAmount;
    
    for (const portfolio of portfolios) {
      targetValues[portfolio] = (targetPercentages[portfolio] / 100) * totalWithRebalance;
    }
    
    // Calculate actions (buy/sell)
    const actions = portfolios.map(portfolio => {
      const difference = targetValues[portfolio] - currentValues[portfolio];
      const action = difference >= 0 ? 'Buy' : 'Sell';
      const absoluteDifference = Math.abs(difference);
      
      return {
        portfolio,
        action,
        amount: absoluteDifference,
        currentValue: currentValues[portfolio],
        targetValue: targetValues[portfolio],
        currentPercentage: currentPercentages[portfolio],
        targetPercentage: targetPercentages[portfolio]
      };
    }).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)); // Sort by amount descending
    
    return actions;
  }, [portfolioData, rebalanceAmount]);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out transform"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Portfolio Rebalance Suggestions</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Investment Amount ({currency})
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={rebalanceAmount}
                onChange={(e) => setRebalanceAmount(parseFloat(e.target.value) || 0)}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                placeholder="Enter amount to invest"
                min="0"
                step="10"
              />
              <Button 
                className="ml-2"
                onClick={() => setRebalanceAmount(0)}
                variant="outline"
              >
                Reset
              </Button>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Enter the amount you want to add to your portfolio. Leave at 0 for pure rebalancing.
            </p>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Rebalance Actions</h3>
            
            {rebalanceSuggestions.length > 0 ? (
              <div className="space-y-4">
                {rebalanceSuggestions.map((suggestion, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border ${
                      suggestion.action === 'Buy' 
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {suggestion.action === 'Buy' ? (
                          <FiTrendingUp className="text-green-500 mr-2" />
                        ) : (
                          <FiTrendingDown className="text-red-500 mr-2" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {suggestion.portfolio}
                        </span>
                      </div>
                      <span className={`font-bold ${
                        suggestion.action === 'Buy' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {suggestion.action} {formatCurrency(suggestion.amount, currency)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Current:</span>{' '}
                        <span className="text-gray-700 dark:text-gray-300">
                          {formatCurrency(suggestion.currentValue, currency)} ({suggestion.currentPercentage.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FiArrowRight className="text-gray-400 mr-2" />
                        <span className="text-gray-500 dark:text-gray-400">Target:</span>{' '}
                        <span className="text-gray-700 dark:text-gray-300 ml-1">
                          {formatCurrency(suggestion.targetValue, currency)} ({suggestion.targetPercentage.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No rebalance suggestions available. Please check your portfolio allocation data.
              </div>
            )}
          </div>
          
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Notes</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-5">
              <li>These suggestions aim to align your portfolio with the target allocation.</li>
              <li>Consider transaction costs when making small adjustments.</li>
              <li>You may want to prioritize larger rebalancing actions first.</li>
              <li>For tax-advantaged accounts, consider the tax implications of selling.</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
