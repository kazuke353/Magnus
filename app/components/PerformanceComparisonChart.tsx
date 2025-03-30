import { useMemo, useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip as ChartTooltip, 
  Legend 
} from 'chart.js';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import { FiEdit2, FiSave, FiX, FiInfo } from 'react-icons/fi';
import { formatPercentage, formatCurrency } from '~/utils/formatters';
import { Benchmark } from '~/utils/portfolio/types';
import CustomTooltip from './CustomTooltip';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

interface PortfolioPerformance {
  name: string;
  returnPercentage: number;
}

interface PerformanceComparisonChartProps {
  portfolioPerformances: PortfolioPerformance[];
  initialBenchmarks?: Benchmark[];
  onSaveBenchmarks?: (benchmarks: Benchmark[]) => void;
  currency?: string;
  totalInvested?: number;
}

export default function PerformanceComparisonChart({ 
  portfolioPerformances, 
  initialBenchmarks = [],
  onSaveBenchmarks,
  currency = 'USD',
  totalInvested = 0
}: PerformanceComparisonChartProps) {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>(initialBenchmarks);
  const [isEditing, setIsEditing] = useState(false);
  const [newBenchmarkName, setNewBenchmarkName] = useState('');
  const [newBenchmarkValue, setNewBenchmarkValue] = useState('');
  const [newBenchmarkDescription, setNewBenchmarkDescription] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1year');
  const [showDetails, setShowDetails] = useState(false);

  // Update benchmarks when initialBenchmarks changes
  useEffect(() => {
    if (initialBenchmarks.length > 0) {
      setBenchmarks(initialBenchmarks);
    }
  }, [initialBenchmarks]);

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
      returnPercentage: newValue,
      description: newBenchmarkDescription || undefined,
      lastUpdated: new Date().toISOString().split('T')[0]
    }]);
    
    setNewBenchmarkName('');
    setNewBenchmarkValue('');
    setNewBenchmarkDescription('');
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

  // Calculate potential returns based on benchmarks
  const potentialReturns = useMemo(() => {
    return benchmarks.map(benchmark => {
      const potentialValue = totalInvested * (1 + benchmark.returnPercentage / 100);
      const difference = potentialValue - totalInvested;
      const percentageDifference = (difference / totalInvested) * 100;
      
      return {
        name: benchmark.name,
        description: benchmark.description,
        currentValue: totalInvested,
        potentialValue,
        difference,
        percentageDifference
      };
    });
  }, [benchmarks, totalInvested]);

  const timeframeOptions = [
    { value: '1week', label: '1 Week' },
    { value: '1month', label: '1 Month' },
    { value: '3months', label: '3 Months' },
    { value: '1year', label: '1 Year' },
    { value: '5years', label: '5 Years' }
  ];

  return (
    <Card className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Performance Comparison</h2>
          <CustomTooltip content="Compare your portfolio performance against market benchmarks">
            <FiInfo className="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" />
          </CustomTooltip>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="text-sm"
            options={timeframeOptions}
          />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Description (optional)</label>
              <Input
                type="text"
                value={newBenchmarkDescription}
                onChange={(e) => setNewBenchmarkDescription(e.target.value)}
                placeholder="e.g., US Large Cap Index"
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
                    <div className="flex-1">
                      <span className="font-medium">{benchmark.name}:</span> {formatPercentage(benchmark.returnPercentage, true)}
                      {benchmark.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{benchmark.description}</p>
                      )}
                      {benchmark.lastUpdated && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Updated: {benchmark.lastUpdated}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveBenchmark(index)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-2"
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
      
      {totalInvested > 0 && benchmarks.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">
              Potential Returns Analysis
            </h3>
            <Button 
              variant="text" 
              className="text-sm text-blue-600 dark:text-blue-400"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>
          
          {showDetails && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Benchmark</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Potential Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Difference</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {potentialReturns.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-750' : ''}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <div>{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.currentValue, currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.potentialValue, currency)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={item.difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {formatCurrency(item.difference, currency)} ({formatPercentage(item.percentageDifference, true)})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {!showDetails && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {potentialReturns.slice(0, 3).map((item, index) => (
                <div key={index} className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                  <div className="font-medium text-gray-800 dark:text-gray-200">{item.name}</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(item.potentialValue, currency)}
                  </div>
                  <div className={`mt-1 text-sm ${item.difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {item.difference >= 0 ? '+' : ''}{formatCurrency(item.difference, currency)} ({formatPercentage(item.percentageDifference, true)})
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            * Potential returns are calculated based on the benchmark annual return rates applied to your current portfolio value.
            These are hypothetical scenarios and not predictions of future performance.
          </p>
        </div>
      )}
    </Card>
  );
}
