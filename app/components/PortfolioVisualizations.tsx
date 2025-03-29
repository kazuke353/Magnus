import { useMemo } from 'react';
import Card from './Card';
import PortfolioChart from './PortfolioChart';
import PortfolioValueChart from './PortfolioValueChart';
import PerformanceComparisonChart from './PerformanceComparisonChart';
import PortfolioAllocationAnalysis from './PortfolioAllocationAnalysis';
import { PerformanceMetrics } from '~/utils/portfolio_fetcher';

interface HistoricalValue {
  date: string;
  value: number;
}

interface Benchmark {
  name: string;
  returnPercentage: number;
}

interface PortfolioVisualizationsProps {
  portfolioData: PerformanceMetrics;
  currency: string;
  currentValue: number;
  historicalValues: HistoricalValue[];
  benchmarks: Benchmark[];
  onRebalanceClick: () => void;
  onSaveHistoricalData: (data: HistoricalValue[]) => void;
  onSaveBenchmarks: (data: Benchmark[]) => void;
  className?: string;
}

export default function PortfolioVisualizations({
  portfolioData,
  currency,
  currentValue,
  historicalValues,
  benchmarks,
  onRebalanceClick,
  onSaveHistoricalData,
  onSaveBenchmarks,
  className = ""
}: PortfolioVisualizationsProps) {
  // Extract portfolio performances for comparison chart
  const portfolioPerformances = useMemo(() => {
    if (!portfolioData?.portfolio) return [];
    
    return portfolioData.portfolio.map(pie => ({
      name: pie.name,
      returnPercentage: pie.returnPercentage
    }));
  }, [portfolioData]);

  if (!portfolioData || !portfolioData.allocationAnalysis) {
    return null;
  }

  return (
    <div className={className}>
      {/* Portfolio Allocation Chart and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Portfolio Performance</h2>
          <PortfolioChart 
            portfolioData={portfolioData} 
            currency={currency}
            showRebalanceButton={true}
            onRebalanceClick={onRebalanceClick}
          />
        </Card>

        <PortfolioAllocationAnalysis 
          allocationData={portfolioData.allocationAnalysis}
          onRebalanceClick={onRebalanceClick}
        />
      </div>

      {/* Portfolio Value Trend and Performance Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PortfolioValueChart 
          currentValue={currentValue}
          currency={currency}
          initialHistoricalData={historicalValues}
          onSaveHistoricalData={onSaveHistoricalData}
        />
        
        <PerformanceComparisonChart 
          portfolioPerformances={portfolioPerformances}
          initialBenchmarks={benchmarks}
          onSaveBenchmarks={onSaveBenchmarks}
        />
      </div>
    </div>
  );
}
