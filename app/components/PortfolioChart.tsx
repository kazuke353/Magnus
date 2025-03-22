import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { PerformanceMetrics } from '~/utils/portfolio_fetcher'; // Correct import from portfolio_fetcher.ts

ChartJS.register(ArcElement, Tooltip, Legend);

interface PortfolioChartProps {
  portfolioData: PerformanceMetrics | null; // Allow null, and use PerformanceMetrics type
}

export default function PortfolioChart({ portfolioData }: PortfolioChartProps) {
  if (!portfolioData || !portfolioData.allocationAnalysis || !portfolioData.allocationAnalysis.currentAllocation) {
    return <div>Loading Portfolio Chart...</div>; // Or handle the loading/error state appropriately
  }

  // Extract data for the pie chart
  const portfolioNames = Object.keys(portfolioData.allocationAnalysis.currentAllocation); // Corrected to allocationAnalysis

  // Extract percentages from strings like "978.98 BGN [50.54%]"
  const currentAllocationValues = Object.values(portfolioData.allocationAnalysis.currentAllocation).map(value => { // Corrected to allocationAnalysis
    const percentMatch = value.match(/\[(.*?)%\]/);
    return percentMatch ? parseFloat(percentMatch[1]) : 0;
  });

  const data = {
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

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 12 }
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

  return (
    <div className="h-64">
      <Pie data={data} options={options} />
    </div>
  );
}
