import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { PortfolioData } from '~/services/portfolio.server';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PortfolioChartProps {
  portfolioData: PortfolioData;
}

export default function PortfolioChart({ portfolioData }: PortfolioChartProps) {
  // Extract data for the pie chart
  const portfolioNames = Object.keys(portfolioData.allocation_analysis.currentAllocation);

  // Extract percentages from strings like "978.98 BGN [50.54%]"
  const currentAllocationValues = Object.values(portfolioData.allocation_analysis.currentAllocation).map(value => {
    const percentMatch = value.match(/\[(.*?)%\]/);
    return percentMatch ? parseFloat(percentMatch[1]) : 0;
  });

  console.log("currentAllocationValues:", currentAllocationValues); // <-- ADD THIS LOG

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