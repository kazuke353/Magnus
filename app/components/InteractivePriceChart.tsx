import { useMemo } from 'react';
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
      Filler, // Import Filler for area charts
      TimeScale, // Import TimeScale for date axis
      TooltipItem // Import TooltipItem type
    } from 'chart.js';
    import 'chartjs-adapter-date-fns'; // Import the date adapter
    import { format, parseISO } from 'date-fns';
    import { formatCurrency } from '~/utils/formatters';

    ChartJS.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      Title,
      Tooltip,
      Legend,
      Filler,
      TimeScale // Register TimeScale
    );

    interface HistoricalDataPoint {
      date: string; // Expecting 'YYYY-MM-DD'
      close: number;
      earnings?: number; // Optional fundamental metric
      dividend?: number; // Optional dividend
    }

    interface KeyMetric {
      eps?: number;
      pe?: number;
    }

    interface YearlyHighLow {
      high: number;
      low: number;
    }

    interface InteractivePriceChartProps {
      ticker: string;
      historicalData: HistoricalDataPoint[];
      keyMetrics?: Record<string, KeyMetric>; // e.g., { 'FY21': { eps: 5.61, pe: 25.0 }, ... }
      yearlyHighLow?: Record<string, YearlyHighLow>; // e.g., { '2021': { high: 150, low: 110 }, ... }
      currency: string;
    }

    export default function InteractivePriceChart({
      ticker,
      historicalData,
      keyMetrics = {},
      yearlyHighLow = {},
      currency
    }: InteractivePriceChartProps) {

      const chartData = useMemo(() => {
        if (!historicalData || historicalData.length === 0) {
          return { labels: [], datasets: [] };
        }

        // Sort data by date just in case
        const sortedData = [...historicalData].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

        const labels = sortedData.map(d => d.date); // Use date strings directly for TimeScale
        const closingPrices = sortedData.map(d => d.close);
        const earningsData = sortedData.map(d => d.earnings); // Example fundamental metric
        const dividendData = sortedData.map(d => d.dividend ? { x: d.date, y: d.close, dividend: d.dividend } : null).filter(Boolean); // Data for dividend points

        // Placeholder for valuation overlay (e.g., fair value range)
        const fairValueLow = sortedData.map(d => d.close * 0.8); // Example: 80% of close
        const fairValueHigh = sortedData.map(d => d.close * 1.2); // Example: 120% of close

        return {
          labels,
          datasets: [
            // Fair Value Area (Green Shaded) - Rendered first to be behind price line
            {
              label: 'Fair Value Range (Example)',
              data: fairValueHigh, // Upper bound
              borderColor: 'rgba(75, 192, 192, 0.1)',
              backgroundColor: 'rgba(75, 192, 192, 0.1)',
              pointRadius: 0,
              fill: '+1', // Fill to the dataset below it (index + 1)
              tension: 0.1,
              order: 3 // Render behind price
            },
            {
              label: 'Fair Value Range Low (Example)', // Lower bound (invisible line)
              data: fairValueLow,
              borderColor: 'transparent',
              backgroundColor: 'transparent',
              pointRadius: 0,
              fill: false, // No fill for the lower bound itself
              order: 4
            },
            // Price Line
            {
              label: 'Closing Price',
              data: closingPrices,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              pointRadius: 0, // Hide default points
              pointHoverRadius: 5,
              tension: 0.1,
              fill: false, // Don't fill area under price line
              order: 2 // Render above fair value
            },
            // Dividend Points (Scatter plot on top)
            {
              type: 'scatter', // Specify scatter type
              label: 'Dividends',
              data: dividendData,
              pointBackgroundColor: 'rgb(255, 99, 132)',
              pointRadius: 4,
              pointHoverRadius: 6,
              showLine: false, // Don't connect points
              order: 1 // Render on top
            },
            // Example Fundamental Metric Line (Optional)
            // {
            //   label: 'Adjusted Operating Earnings',
            //   data: earningsData,
            //   borderColor: 'rgb(255, 159, 64)',
            //   borderWidth: 1,
            //   borderDash: [5, 5], // Dashed line
            //   pointRadius: 0,
            //   tension: 0.1,
            //   fill: false,
            //   yAxisID: 'y1', // Use a secondary axis if scales differ significantly
            //   order: 5
            // },
          ],
        };
      }, [historicalData]);

      const chartOptions = useMemo(() => {
        return {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index' as const, // Show tooltip for all datasets at the same index
            intersect: false,
          },
          scales: {
            x: {
              type: 'time' as const, // Use time scale
              time: {
                unit: 'month' as const, // Adjust unit based on data range
                tooltipFormat: 'MMM dd, yyyy', // Format for tooltip title
                displayFormats: {
                  month: 'MMM yyyy' // Format for axis labels
                }
              },
              title: {
                display: true,
                text: 'Date',
              },
              grid: {
                display: false,
              },
            },
            y: { // Primary Y-axis for price
              type: 'linear' as const,
              display: true,
              position: 'left' as const,
              title: {
                display: true,
                text: `Price (${currency})`,
              },
              ticks: {
                callback: (value: number | string) => formatCurrency(typeof value === 'string' ? parseFloat(value) : value, currency, 0),
              },
            },
            // y1: { // Secondary Y-axis (optional, for earnings etc.)
            //   type: 'linear' as const,
            //   display: true, // Set to true to show
            //   position: 'right' as const,
            //   title: {
            //     display: true,
            //     text: 'Earnings (Example)',
            //   },
            //   grid: {
            //     drawOnChartArea: false, // only want the grid lines for one axis to show up
            //   },
            // },
          },
          plugins: {
            legend: {
              position: 'top' as const,
            },
            title: {
              display: true,
              text: `${ticker} Price History`,
            },
            tooltip: {
              callbacks: {
                // Custom tooltip content
                label: function(context: TooltipItem<any>) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.dataset.type === 'scatter' && context.raw?.dividend) {
                     label = `Dividend: ${formatCurrency(context.raw.dividend, currency)}`;
                  } else if (context.parsed.y !== null) {
                    label += formatCurrency(context.parsed.y, currency);
                  }
                  // Add P/E, Volume etc. based on the date (context.label)
                  // This requires looking up data outside the chart dataset
                  // Example: const pe = findPEForDate(context.label); label += `\nP/E: ${pe}`;
                  return label;
                },
                // Add more data to the footer
                footer: function(tooltipItems: TooltipItem<any>[]) {
                    // Example: Find data for the hovered date
                    const date = tooltipItems[0]?.label; // Date string from x-axis
                    // Look up volume, market value etc. for this date
                    // return [`Volume: ${volume}`, `Market Val: ${mktVal}`];
                    return []; // Placeholder
                }
              },
            },
          },
        };
      }, [ticker, currency]);

      // Prepare data for the metrics table below the chart
      const metricsYears = Object.keys(keyMetrics).sort();
      const yearlyHighLowYears = Object.keys(yearlyHighLow).sort();

      return (
        <div className="space-y-4 p-4">
          <div className="h-80 md:h-96"> {/* Adjust height as needed */}
            <Line options={chartOptions} data={chartData} />
          </div>

          {/* Key Metrics Table */}
          {metricsYears.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Key Metrics (Fiscal Year)</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-center">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-1">Metric</th>
                      {metricsYears.map(year => <th key={year} className="px-2 py-1">{year}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    <tr>
                      <td className="px-2 py-1 font-medium text-left">EPS</td>
                      {metricsYears.map(year => <td key={year} className="px-2 py-1">{keyMetrics[year]?.eps?.toFixed(2) ?? '-'}</td>)}
                    </tr>
                    <tr>
                      <td className="px-2 py-1 font-medium text-left">P/E</td>
                      {metricsYears.map(year => <td key={year} className="px-2 py-1">{keyMetrics[year]?.pe?.toFixed(1) ?? '-'}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Yearly High/Low Table */}
          {yearlyHighLowYears.length > 0 && (
             <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 mt-2">Yearly High/Low</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-center">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-1">Year</th>
                      {yearlyHighLowYears.map(year => <th key={year} className="px-2 py-1">{year}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    <tr>
                      <td className="px-2 py-1 font-medium text-left">High</td>
                      {yearlyHighLowYears.map(year => <td key={year} className="px-2 py-1">{formatCurrency(yearlyHighLow[year]?.high, currency, 0)}</td>)}
                    </tr>
                    <tr>
                      <td className="px-2 py-1 font-medium text-left">Low</td>
                      {yearlyHighLowYears.map(year => <td key={year} className="px-2 py-1">{formatCurrency(yearlyHighLow[year]?.low, currency, 0)}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

           {/* Graph Key (Placeholder) */}
           <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
             <h4 className="font-medium mb-1">Graph Key:</h4>
             <ul className="list-disc list-inside space-y-1">
                <li><span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span> Closing Price</li>
                <li><span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span> Dividend Payment</li>
                <li><span className="inline-block w-3 h-3 bg-teal-500/30 mr-1"></span> Fair Value Range (Example)</li>
                {/* Add more key items */}
             </ul>
           </div>
        </div>
      );
    }
