import { useMemo } from 'react';
import Card from './Card';
import SortableTable from './SortableTable';
import { formatDate, formatCurrency, formatPercentage } from '~/utils/formatters';

interface Instrument {
  fullName: string;
  ticker: string;
  type: string;
  ownedQuantity: number;
  investedValue: number;
  currentValue: number;
  resultValue: number;
  dividendYield?: number;
  performance_1week?: number;
  performance_1month?: number;
  performance_3months?: number;
  performance_1year?: number;
}

interface Portfolio {
  name: string;
  creationDate: string;
  totalInvested: number;
  totalResult: number;
  returnPercentage: number;
  dividendCashAction: string;
  instruments: Instrument[];
}

interface PortfolioBreakdownProps {
  portfolios: Portfolio[];
  currency: string;
  className?: string;
}

export default function PortfolioBreakdown({
  portfolios,
  currency,
  className = ""
}: PortfolioBreakdownProps) {
  if (!portfolios || portfolios.length === 0) {
    return (
      <section className={`space-y-6 ${className}`}>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio Breakdown</h2>
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No portfolio data available.</p>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className={`space-y-6 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio Breakdown</h2>
      {portfolios.map((portfolio, index) => (
        <Card key={index} title={portfolio.name} className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Creation Date: {formatDate(portfolio.creationDate)}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Invested</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(portfolio.totalInvested, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Result</p>
                <p className={`text-lg font-semibold ${portfolio.totalResult >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(portfolio.totalResult, currency, true)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Return Percentage</p>
                <p className={`text-lg font-semibold ${portfolio.returnPercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatPercentage(portfolio.returnPercentage, true)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dividend Cash Action</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{portfolio.dividendCashAction}</p>
              </div>
            </div>

            {/* Instruments Table */}
            <SortableTable
              data={portfolio.instruments}
              itemsPerPage={10}
              emptyMessage="No instruments found in this portfolio."
              columns={[
                {
                  key: "fullName",
                  header: "Instrument",
                  sortable: true,
                  filterable: true,
                  render: (item) => (
                    <span className="font-medium text-gray-900 dark:text-gray-100">{item.fullName}</span>
                  )
                },
                {
                  key: "ticker",
                  header: "Ticker",
                  sortable: true,
                  filterable: true,
                  render: (item) => (
                    <span className="text-gray-500 dark:text-gray-400">{item.ticker}</span>
                  )
                },
                {
                  key: "type",
                  header: "Type",
                  sortable: true,
                  filterable: true,
                  render: (item) => (
                    <span className="text-gray-500 dark:text-gray-400">{item.type}</span>
                  )
                },
                {
                  key: "ownedQuantity",
                  header: "Quantity",
                  sortable: true,
                  render: (item) => (
                    <span className="text-gray-900 dark:text-gray-100">{item.ownedQuantity.toFixed(2)}</span>
                  )
                },
                {
                  key: "investedValue",
                  header: "Invested",
                  sortable: true,
                  render: (item) => (
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.investedValue, currency)}
                    </span>
                  )
                },
                {
                  key: "currentValue",
                  header: "Current Value",
                  sortable: true,
                  render: (item) => (
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.currentValue, currency)}
                    </span>
                  )
                },
                {
                  key: "resultValue",
                  header: "Result",
                  sortable: true,
                  render: (item) => (
                    <span className={`font-semibold ${item.resultValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(item.resultValue, currency, true)}
                    </span>
                  )
                },
                {
                  key: "dividendYield",
                  header: "Div. Yield",
                  sortable: true,
                  render: (item) => (
                    <span className="text-gray-900 dark:text-gray-100">
                      {item.dividendYield ? `${item.dividendYield}%` : 'N/A'}
                    </span>
                  )
                },
                {
                  key: "performance_1week",
                  header: "1W Perf.",
                  sortable: true,
                  render: (item) => (
                    <span className={`${item.performance_1week >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {item.performance_1week ? formatPercentage(item.performance_1week) : 'N/A'}
                    </span>
                  )
                },
                {
                  key: "performance_1month",
                  header: "1M Perf.",
                  sortable: true,
                  render: (item) => (
                    <span className={`${item.performance_1month >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {item.performance_1month ? formatPercentage(item.performance_1month) : 'N/A'}
                    </span>
                  )
                },
                {
                  key: "performance_3months",
                  header: "3M Perf.",
                  sortable: true,
                  render: (item) => (
                    <span className={`${item.performance_3months >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {item.performance_3months ? formatPercentage(item.performance_3months) : 'N/A'}
                    </span>
                  )
                },
                {
                  key: "performance_1year",
                  header: "1Y Perf.",
                  sortable: true,
                  render: (item) => (
                    <span className={`${item.performance_1year >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {item.performance_1year ? formatPercentage(item.performance_1year) : 'N/A'}
                    </span>
                  )
                }
              ]}
            />
          </div>
        </Card>
      ))}
    </section>
  );
}
