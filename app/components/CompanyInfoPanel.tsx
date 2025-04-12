    import Card from './Card';
    import { formatNumber } from '~/utils/formatters';

    interface CompanyInfoPanelProps {
      data: {
        gicsSubIndustry?: string;
        domicile?: string;
        marketCap?: number;
        spCreditRating?: string;
        ltDebtCapital?: number; // Assuming percentage
        trxVolume?: number; // Assuming volume
        spxRelated?: string;
      };
    }

    export default function CompanyInfoPanel({ data }: CompanyInfoPanelProps) {
      return (
        <Card title="Company Information">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">GICS Sub-Industry</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100 text-right truncate">
                {data.gicsSubIndustry || '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Domicile</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {data.domicile || '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Market Cap</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {data.marketCap ? formatNumber(data.marketCap, 0) : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">S&P Credit Rating</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {data.spCreditRating || '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">LT Debt/Capital</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {data.ltDebtCapital ? `${data.ltDebtCapital.toFixed(1)}%` : '-'}
              </dd>
            </div>
             <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">TRX Volume</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {data.trxVolume ? formatNumber(data.trxVolume, 0) : '-'}
              </dd>
            </div>
             <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">S&P Related</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {data.spxRelated || '-'}
              </dd>
            </div>
          </dl>
        </Card>
      );
    }
