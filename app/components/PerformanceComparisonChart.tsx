import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import { FiEdit2, FiSave, FiX } from 'react-icons/fi';
import { formatPercentage } from '~/utils/formatters';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PortfolioPerformance {
  name: string;
  returnPercentage: number;
}

interface Benchmark {
  name: string;
  returnPercentage: number;
}

interface PerformanceComparisonChartProps {
  portfolioPerformances: PortfolioPerformance[];
  initialBenchmarks?: Benchmark[];
  onSaveBenchmarks?: (benchmarks: Benchmark[]) => void;
}

export default function PerformanceComparisonChart({ 
  portfolioPerformances, 
  initialBenchmarks = [],
  onSaveBenchmarks
}: PerformanceComparisonChartProps) {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>(initialBenchmarks);
  const [isEditing, setIsEditing] = useState(false);
  const [newBenchmarkName, setNewBenchmarkName] = useState('');
  const [newBenchmarkValue, setNewBenchmarkValue] = useState('');

  const chartData = useMemo(() => {
    const labels = [
      ...portfolioPerformances.map(p => p.name),
      ...benchmarks.map(b => b.name)
    ];

    const portfolioData = portfolioPerformances.map(p => p.returnPercentage);
    const benchmarkData = benchmarks.map(b => b.returnPercentage);

    // Fill with nulls to align data
    const portfolioDataFull = [...portfolioData, ...Array(benchmarks.length).fill(null)];
    const benchmarkDataFull = [...Array(portfolioPerformances.length).fill(null), ...benchmarkData];

    return {
      labels,
      datasets: [
        {
          label: 'Portfolio',
          data: portfolioDataFull,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
        {
          label: 'Benchmark',
          data: benchmarkDataFull,
          backgroundColor: 'rgba(234, 88, 12, 0.7)',
          borderColor: 'rgb(234, 88, 12)',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }
      ]
    };
  }, [portfolioPerformances, benchmarks]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
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
              if (context.raw === null) return '';
              return `${context.dataset.label}: ${formatPercentage(context.raw, true)}`;
            }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 6
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgb(107, 114, 128)'
          }
        },
        y: {
          grid: {
            color: 'rgba(107, 114, 128, 0.1)'
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            callback: function(value: any) {
              return formatPercentage(value, false);
            }
          }
        }
      }
    };
  }, []);

  const handleAddBenchmark = () => {
    if (!newBenchmarkName || !newBenchmarkValue) return;
    
    const newValue = parseFloat(newBenchmarkValue);
    if (isNaN(newValue)) return;
    
    setBenchmarks([...benchmarks, {
      name: newBenchmarkName,
      returnPercentage: newValue
    }]);
    
    setNewBenchmarkName('');
    setNewBenchmarkValue('');
  };

  const handleRemoveBenchmark = (index: number) => {
    const updatedBenchmarks = [...benchmarks];
    updatedBenchmarks.splice(index, 1);
    setBenchmarks(updatedBenchmarks);
  };

  const handleSaveBenchmarks = () => {
    if (onSaveBenchmarks) {
      onSaveBenchmarks(benchmarks);
    }
    setIsEditing(false);
  };

  return (
    <Card className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Performance Comparison</h2>
        <div>
          {isEditing ? (
            <Button 
              onClick={handleSaveBenchmarks}
              className="text-sm"
            >
              <FiSave className="mr-1" /> Save
            </Button>
          ) : (
            <Button 
              onClick={() => setIsEditing(true)} 
              variant="outline"
              className="text-sm"
            >
              <FiEdit2 className="mr-1" /> Edit Benchmarks
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add Benchmark</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Name</label>
              <Input
                type="text"
                value={newBenchmarkName}
                onChange={(e) => setNewBenchmarkName(e.target.value)}
                placeholder="e.g., S&P 500"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Return (%)</label>
              <Input
                type="number"
                value={newBenchmarkValue}
                onChange={(e) => setNewBenchmarkValue(e.target.value)}
                placeholder="e.g., 8.5"
                step="0.01"
                className="w-full"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button 
              onClick={handleAddBenchmark}
              className="text-sm"
            >
              Add Benchmark
            </Button>
          </div>

          {benchmarks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Benchmarks</h3>
              <div className="space-y-2">
                {benchmarks.map((benchmark, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-200 dark:bg-gray-600 rounded">
                    <div>
                      <span className="font-medium">{benchmark.name}:</span> {formatPercentage(benchmark.returnPercentage, true)}
                    </div>
                    <button
                      onClick={() => handleRemoveBenchmark(index)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      title="Remove benchmark"
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="h-80">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </Card>
  );
}
