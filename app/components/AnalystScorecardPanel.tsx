import Card from './Card';
import { FiTrendingUp, FiTrendingDown, FiMinusCircle, FiBarChart2 } from 'react-icons/fi'; // Updated icons
import { RecommendationTrend } from '~/utils/portfolio/types'; // Import the correct type

interface AnalystScorecardPanelProps {
  // Change the prop to accept recommendationTrend data
  recommendationTrend?: RecommendationTrend[];
}

// Helper function to get the latest trend data
const getLatestTrend = (trends?: RecommendationTrend[]): RecommendationTrend | null => {
  if (!trends || trends.length === 0) return null;
  // Assuming '0m' represents the latest trend
  return trends.find(t => t.period === '0m') || trends[trends.length - 1];
};

export default function AnalystScorecardPanel({ recommendationTrend }: AnalystScorecardPanelProps) {
  const latestTrend = getLatestTrend(recommendationTrend);

  if (!latestTrend) {
    return (
      <Card title="Analyst Recommendations">
        <p className="text-sm text-gray-500 dark:text-gray-400 p-4">Recommendation data not available.</p>
      </Card>
    );
  }

  const totalAnalysts = latestTrend.strongBuy + latestTrend.buy + latestTrend.hold + latestTrend.sell + latestTrend.strongSell;
  const buyPercent = totalAnalysts > 0 ? ((latestTrend.strongBuy + latestTrend.buy) / totalAnalysts) * 100 : 0;
  const holdPercent = totalAnalysts > 0 ? (latestTrend.hold / totalAnalysts) * 100 : 0;
  const sellPercent = totalAnalysts > 0 ? ((latestTrend.sell + latestTrend.strongSell) / totalAnalysts) * 100 : 0;

  return (
    <Card title="Analyst Recommendations">
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">Based on {totalAnalysts} analysts (Latest Trend)</p>
        <div className="space-y-2">
          {/* Buy Ratings */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center">
              <FiTrendingUp className="mr-1" /> Buy / Strong Buy
            </span>
            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
              {buyPercent.toFixed(0)}% ({latestTrend.strongBuy + latestTrend.buy})
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${buyPercent}%` }}></div>
          </div>

          {/* Hold Ratings */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <FiMinusCircle className="mr-1" /> Hold
            </span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {holdPercent.toFixed(0)}% ({latestTrend.hold})
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-gray-500 h-2 rounded-full" style={{ width: `${holdPercent}%` }}></div>
          </div>

          {/* Sell Ratings */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center">
              <FiTrendingDown className="mr-1" /> Sell / Strong Sell
            </span>
            <span className="text-sm font-semibold text-red-700 dark:text-red-300">
              {sellPercent.toFixed(0)}% ({latestTrend.sell + latestTrend.strongSell})
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${sellPercent}%` }}></div>
          </div>
        </div>
      </div>
    </Card>
  );
}
