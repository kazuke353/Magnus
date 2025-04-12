    import Card from './Card';
    import { formatCurrency, formatPercentage } from '~/utils/formatters';

    interface FastFactsPanelProps {
      data: {
        previousClose?: number;
        blendedPE?: number;
        epsValuation?: number; // Assuming this is a price
        dividendYield?: number;
        type?: string;
      };
      currency: string;
    }

    export default function FastFactsPanel({ data, currency }: FastFactsPanelProps) {
      return (
        <Card title="Fast Facts">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Previous Close</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {data.previousClose ? formatCurrency(data.previousClose, currency) : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Blended P/E</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {data.blendedPE ? data.blendedPE.toFixed(1) : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">EPS Valuation</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {data.epsValuation ? formatCurrency(data.epsValuation, currency) : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Dividend Yield</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {data.dividendYield ? formatPercentage(data.dividendYield) : '-'}
              </dd>
            </div>
             <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Security Type</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {data.type || '-'}
              </dd>
            </div>
          </dl>
        </Card>
      );
    }
