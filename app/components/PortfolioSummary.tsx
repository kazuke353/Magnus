import { useMemo } from "react";
import Card from "~/components/Card";
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiCalendar } from "react-icons/fi";
import { formatCurrency, formatDate } from "~/utils/formatters";

interface PortfolioSummaryProps {
  totalInvested: number;
  totalResult: number;
  returnPercentage: number;
  fetchDate: string;
  estimatedAnnualDividend: number;
  currency: string;
  className?: string;
  compact?: boolean;
}

export default function PortfolioSummary({
  totalInvested,
  totalResult,
  returnPercentage,
  fetchDate,
  estimatedAnnualDividend,
  currency,
  className = "",
  compact = false
}: PortfolioSummaryProps) {
  // Determine if we should show all items or just the main ones in compact mode
  const showAllItems = !compact;

  return (
    <Card className={`shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6 ${className}`}>
      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-6`}>
        {/* Invested */}
        <div className="p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-800 mr-4">
              <FiDollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">INVESTED</h3>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {formatCurrency(totalInvested, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Return */}
        <div className="p-4">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${totalResult >= 0 ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'} mr-4`}>
              {totalResult >= 0 ? (
                <FiTrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <FiTrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">RETURN</h3>
              <p className={`text-xl font-bold ${totalResult >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} mt-1`}>
                {formatCurrency(totalResult, currency, true)}
                {!compact && (
                  <span className="text-sm ml-1">
                    ({returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Est. Annual Dividends - Only show if not compact */}
        {showAllItems && (
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-teal-100 dark:bg-teal-800 mr-4">
                <FiDollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">EST. ANNUAL DIVIDENDS</h3>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {formatCurrency(estimatedAnnualDividend, currency)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated - Only show if not compact */}
        {showAllItems ? (
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 mr-4">
                <FiCalendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">LAST UPDATED</h3>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1" title={fetchDate}>
                  {formatDate(fetchDate)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          // In compact mode, show return percentage as the third item
          <div className="p-4">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${returnPercentage >= 0 ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'} mr-4`}>
                {returnPercentage >= 0 ? (
                  <FiTrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <FiTrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">RETURN %</h3>
                <p className={`text-xl font-bold ${returnPercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} mt-1`}>
                  {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
