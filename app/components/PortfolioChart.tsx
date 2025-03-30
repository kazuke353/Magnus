import { useMemo, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { PerformanceMetrics } from '~/utils/portfolio_fetcher';
import SkeletonLoader from './SkeletonLoader';
import Button from './Button';
import { FiRefreshCw } from 'react-icons/fi';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PortfolioChartProps {
  portfolioData: PerformanceMetrics | null;
  currency?: string;
  showRebalanceButton?: boolean;
  onRebalanceClick?: () => void;
}

export default function PortfolioChart({ 
  portfolioData, 
  currency = 'BGN', 
  showRebalanceButton = false,
  onRebalanceClick
}: PortfolioChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const chartData = useMemo(() => {
    if (!portfolioData || !portfolioData.allocationAnalysis || !portfolioData.allocationAnalysis.currentAllocation) {
      return null;
    }

    // Extract data for the pie chart
    const portfolioNames = Object.keys(portfolioData.allocationAnalysis.currentAllocation);

    // Extract percentages from the 'percent' property of the objects
    const currentAllocationValues = Object.values(portfolioData.allocationAnalysis.currentAllocation).map(valueObj => {
      // Access the 'percent' property of the object
      return typeof valueObj.percent === 'number' ? valueObj.percent : 0;
    });

    return {
      labels: portfolioNames,
      datasets: [
        {
          label: 'Current Allocation',
          data: currentAllocationValues,
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(201, 203, 207, 0.6)',
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(201, 203, 207, 1)',
          ],
          borderWidth: 1,
          hoverBorderWidth: 3,
          hoverBorderColor: '#ffffff',
        },
      ],
    };
  }, [portfolioData]);

  // Get allocation differences for hover details
  const allocationDifferences = useMemo(() => {
    if (!portfolioData?.allocationAnalysis?.allocationDifferences) {
      return {};
    }
    return portfolioData.allocationAnalysis.allocationDifferences;
  }, [portfolioData]);

  // Calculate estimated values for each segment
  const segmentValues = useMemo(() => {
    if (!portfolioData?.overallSummary?.overallSummary?.totalInvestedOverall || !chartData) {
      return {};
    }
    
    const totalInvested = portfolioData.overallSummary.overallSummary.totalInvestedOverall;
    const result: Record<string, number> = {};
    
    chartData.labels.forEach((label, index) => {
      const percentage = chartData.datasets[0].data[index] / 100;
      result[label as string] = totalInvested * percentage;
    });
    
    return result;
  }, [portfolioData, chartData]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: 'rgb(107, 114, 128)',
            font: {
              size: 12
            },
            padding: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              const label = context.label || '';
              const value = context.raw || 0;
              const segmentValue = segmentValues[label] ? 
                `${segmentValues[label].toFixed(2)} ${currency}` : '';
              const difference = allocationDifferences[label] || '';
              
              return [
                `${label}: ${value.toFixed(2)}%`,
                `Value: ${segmentValue}`,
                `Difference: ${difference}`
              ];
            }
          },
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 6,
          boxPadding: 4
        }
      },
      onHover: (event: any, elements: any) => {
        if (elements && elements.length > 0) {
          const index = elements[0].index;
          const label = chartData?.labels?.[index] as string;
          setHoveredSegment(label);
        } else {
          setHoveredSegment(null);
        }
      }
    };
  }, [currency, segmentValues, allocationDifferences, chartData]);

  if (!chartData) {
    return <SkeletonLoader type="chart" height="h-80" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          {hoveredSegment && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">{hoveredSegment}:</span> {segmentValues[hoveredSegment]?.toFixed(2)} {currency}
              <span className={`ml-2 ${allocationDifferences[hoveredSegment] < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {allocationDifferences[hoveredSegment]}
              </span>
            </div>
          )}
        </div>
        
        {showRebalanceButton && (
          <Button 
            onClick={onRebalanceClick}
            className="text-sm"
            variant="outline"
          >
            <FiRefreshCw className="mr-2" />
            Rebalance Portfolio
          </Button>
        )}
      </div>
      
      <div className="h-80">
        <Pie data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
