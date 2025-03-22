import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { PerformanceMetrics } from '~/utils/portfolio_fetcher';
import SkeletonLoader from './SkeletonLoader';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PortfolioChartProps {
  portfolioData: PerformanceMetrics | null;
}

export default function PortfolioChart({ portfolioData }: PortfolioChartProps) {
  const chartData = useMemo(() => {
    if (!portfolioData || !portfolioData.allocationAnalysis || !portfolioData.allocationAnalysis.currentAllocation) {
      return null;
    }

    // Extract data for the pie chart
    const portfolioNames = Object.keys(portfolioData.allocationAnalysis.currentAllocation);

    // Extract percentages from strings like "50.54%"
    const currentAllocationValues = Object.values(portfolioData.allocationAnalysis.currentAllocation).map(value => {
      const percentMatch = value.match(/^(.*?)%$/);
      return percentMatch ? parseFloat(percentMatch[1]) : 0;
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
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [portfolioData]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: 'rgb(107, 114, 128)',
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              return `${context.label}: ${context.raw}%`;
            }
          }
        }
      },
    };
  }, []);

  if (!chartData) {
    return <SkeletonLoader type="chart" height="h-64" />;
  }

  return (
    <div className="h-64">
      <Pie data={chartData} options={chartOptions} />
    </div>
  );
}
