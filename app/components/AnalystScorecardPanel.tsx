    import Card from './Card';
    import { FiCheckCircle, FiXCircle, FiMinusCircle } from 'react-icons/fi';

    interface AnalystStats {
      beat: number;
      miss: number;
      push: number; // Assuming 'push' means met estimates
    }

    interface AnalystScorecardPanelProps {
      data?: {
        overallBeatPercent?: number;
        oneYearStats?: AnalystStats;
        twoYearStats?: AnalystStats;
      };
    }

    export default function AnalystScorecardPanel({ data }: AnalystScorecardPanelProps) {
      if (!data) {
        return (
          <Card title="Analyst Scorecard">
            <p className="text-sm text-gray-500 dark:text-gray-400">Data not available.</p>
          </Card>
        );
      }

      const renderStats = (stats?: AnalystStats) => {
        if (!stats) return <span className="text-gray-500">-</span>;
        const total = stats.beat + stats.miss + stats.push;
        if (total === 0) return <span className="text-gray-500">-</span>;
        const beatPercent = ((stats.beat / total) * 100).toFixed(0);
        const missPercent = ((stats.miss / total) * 100).toFixed(0);
        const pushPercent = ((stats.push / total) * 100).toFixed(0);

        return (
          <div className="flex space-x-2 items-center">
            <span className="flex items-center text-green-600 dark:text-green-400" title="Beat Estimates">
              <FiCheckCircle className="mr-1" /> {beatPercent}%
            </span>
            <span className="flex items-center text-red-600 dark:text-red-400" title="Missed Estimates">
              <FiXCircle className="mr-1" /> {missPercent}%
            </span>
             <span className="flex items-center text-gray-500 dark:text-gray-400" title="Met Estimates">
              <FiMinusCircle className="mr-1" /> {pushPercent}%
            </span>
          </div>
        );
      };

      return (
        <Card title="Analyst Scorecard">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-gray-500 dark:text-gray-400">Overall Beat %</dt>
              <dd className="font-medium text-lg text-green-600 dark:text-green-400">
                {data.overallBeatPercent ? `${data.overallBeatPercent.toFixed(0)}%` : '-'}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500 dark:text-gray-400">1-Year Fwd</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {renderStats(data.oneYearStats)}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500 dark:text-gray-400">2-Year Fwd</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {renderStats(data.twoYearStats)}
              </dd>
            </div>
          </dl>
           <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Based on analyst earnings estimates.</p>
        </Card>
      );
    }
