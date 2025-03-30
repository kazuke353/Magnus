import { useState } from 'react';
import { PerformanceMetrics, Benchmark } from '~/utils/portfolio/types';
import PortfolioChart from './PortfolioChart';
import PortfolioAllocationAnalysis from './PortfolioAllocationAnalysis';
import PortfolioValueChart from './PortfolioValueChart';
import PerformanceComparisonChart from './PerformanceComparisonChart';
import Button from './Button';
import { FiRefreshCw } from 'react-icons/fi';

interface HistoricalValue {
  date: string;
  value: number;
}

interface PortfolioVisualizationsProps {
  portfolioData: PerformanceMetrics;
  currency: string;
  currentValue: number;
  historicalValues: HistoricalValue[];
  benchmarks?: Benchmark[];
  onRebalanceClick: () => void;
  onSaveHistoricalData?: (data: HistoricalValue[]) => void;
  onSaveBenchmarks?: (benchmarks: Benchmark[]) => void;
}

export default function PortfolioVisualizations({
  portfolioData,
  currency,
  currentValue,
  historicalValues,
  benchmarks = [],
  onRebalanceClick,
  onSaveHistoricalData,
  onSaveBenchmarks
}: PortfolioVisualizationsProps) {
  const [activeTab, setActiveTab] = useState('allocation');

  // Extract portfolio performances for comparison chart
  const portfolioPerformances = portfolioData.portfolio
    ? portfolioData.portfolio
        .filter(pie => pie.name !== 'OverallSummary')
        .map(pie => ({
          name: pie.name,
          returnPercentage: pie.returnPercentage
        }))
    : [];

  // Add overall portfolio performance
  if (portfolioData.overallSummary?.overallSummary) {
    portfolioPerformances.unshift({
      name: 'Overall Portfolio',
      returnPercentage: portfolioData.overallSummary.overallSummary.returnPercentageOverall
    });
  }

  // Use benchmarks from portfolio data if available, otherwise use props
  const displayBenchmarks = portfolioData.benchmarks?.length 
    ? portfolioData.benchmarks 
    : benchmarks;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2">
          <PortfolioChart
            portfolioData={portfolioData}
            currency={currency}
          />
        </div>
        <div className="w-full md:w-1/2">
          <PortfolioAllocationAnalysis
            allocationAnalysis={portfolioData.allocationAnalysis}
            onRebalanceClick={onRebalanceClick}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2">
          <PortfolioValueChart
            currentValue={currentValue}
            historicalValues={historicalValues}
            currency={currency}
            onSaveHistoricalData={onSaveHistoricalData}
          />
        </div>
        <div className="w-full md:w-1/2">
          <PerformanceComparisonChart
            portfolioPerformances={portfolioPerformances}
            initialBenchmarks={displayBenchmarks}
            onSaveBenchmarks={onSaveBenchmarks}
            currency={currency}
            totalInvested={portfolioData.overallSummary?.overallSummary.totalInvestedOverall || 0}
          />
        </div>
      </div>
    </div>
  );
}
