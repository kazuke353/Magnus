import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import { FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import { formatCurrency } from '~/utils/formatters';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HistoricalValue {
  date: string;
  value: number;
}

interface PortfolioValueChartProps {
  currentValue: number;
  currency?: string;
  initialHistoricalData?: HistoricalValue[];
  onSaveHistoricalData?: (data: HistoricalValue[]) => void;
}

export default function PortfolioValueChart({ 
  currentValue, 
  currency = 'BGN',
  initialHistoricalData = [],
  onSaveHistoricalData
}: PortfolioValueChartProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalValue[]>(
    initialHistoricalData.length > 0 ? initialHistoricalData : []
  );
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [newEntryDate, setNewEntryDate] = useState('');
  const [newEntryValue, setNewEntryValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Add current value to the chart data
  const allData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have today's date
    const hasTodayEntry = historicalData.some(entry => entry.date === today);
    
    if (hasTodayEntry) {
      return [...historicalData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      return [...historicalData, { date: today, value: currentValue }]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }, [historicalData, currentValue]);

  const chartData = useMemo(() => {
    return {
      labels: allData.map(entry => {
        const date = new Date(entry.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Portfolio Value',
          data: allData.map(entry => entry.value),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: true
        }
      ]
    };
  }, [allData]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              return `Value: ${formatCurrency(context.raw, currency)}`;
            },
            title: function(tooltipItems: any) {
              const index = tooltipItems[0].dataIndex;
              return allData[index].date;
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
          beginAtZero: false,
          grid: {
            color: 'rgba(107, 114, 128, 0.1)'
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            callback: function(value: any) {
              return formatCurrency(value, currency, false);
            }
          }
        }
      }
    };
  }, [currency, allData]);

  const handleAddEntry = () => {
    if (!newEntryDate || !newEntryValue) return;
    
    const newValue = parseFloat(newEntryValue);
    if (isNaN(newValue)) return;
    
    const newEntry = {
      date: newEntryDate,
      value: newValue
    };
    
    // Check if we already have an entry for this date
    const existingEntryIndex = historicalData.findIndex(entry => entry.date === newEntryDate);
    
    if (existingEntryIndex >= 0) {
      // Update existing entry
      const updatedData = [...historicalData];
      updatedData[existingEntryIndex] = newEntry;
      setHistoricalData(updatedData);
    } else {
      // Add new entry
      setHistoricalData([...historicalData, newEntry]);
    }
    
    // Reset form
    setNewEntryDate('');
    setNewEntryValue('');
    setIsAddingEntry(false);
  };

  const handleDeleteEntry = (date: string) => {
    setHistoricalData(historicalData.filter(entry => entry.date !== date));
  };

  const handleSaveData = () => {
    if (onSaveHistoricalData) {
      onSaveHistoricalData(historicalData);
    }
    setIsEditing(false);
  };

  return (
    <Card className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Portfolio Value Trend</h2>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button 
                onClick={() => setIsAddingEntry(true)} 
                variant="outline" 
                className="text-sm"
              >
                <FiPlus className="mr-1" /> Add Entry
              </Button>
              <Button 
                onClick={handleSaveData}
                className="text-sm"
              >
                <FiSave className="mr-1" /> Save
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => setIsEditing(true)} 
              variant="outline"
              className="text-sm"
            >
              Edit History
            </Button>
          )}
        </div>
      </div>

      {isAddingEntry && (
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add Historical Value</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Date</label>
              <Input
                type="date"
                value={newEntryDate}
                onChange={(e) => setNewEntryDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Value ({currency})</label>
              <Input
                type="number"
                value={newEntryValue}
                onChange={(e) => setNewEntryValue(e.target.value)}
                placeholder="Enter value"
                min="0"
                step="0.01"
                className="w-full"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4 space-x-2">
            <Button 
              onClick={() => setIsAddingEntry(false)} 
              variant="outline"
              className="text-sm"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddEntry}
              className="text-sm"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      <div className="h-80">
        {allData.length > 1 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">Not enough historical data to display a trend.</p>
              {!isEditing && (
                <Button 
                  onClick={() => {
                    setIsEditing(true);
                    setIsAddingEntry(true);
                  }}
                  variant="outline"
                >
                  <FiPlus className="mr-2" />
                  Add Historical Data
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {isEditing && historicalData.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Historical Entries</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {historicalData.map((entry) => (
                  <tr key={entry.date}>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{entry.date}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{formatCurrency(entry.value, currency)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDeleteEntry(entry.date)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                        title="Delete entry"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
