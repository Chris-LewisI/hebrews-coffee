'use client';

import { useState, useEffect } from 'react';
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
  ChartOptions,
} from 'chart.js';
import { Calendar, Clock, TrendingUp } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TimeSeriesData {
  time: string;
  count: number;
  label: string;
}

interface BusyHour {
  hour: number;
  count: number;
  label: string;
}

interface OrdersOverTimeData {
  timeSeries: TimeSeriesData[];
  busyHours: BusyHour[];
  totalOrders: number;
  dateRange: { startDate: string; endDate: string };
  groupBy: string;
}

export default function OrdersOverTimeChart() {
  const [data, setData] = useState<OrdersOverTimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [groupBy, setGroupBy] = useState<'hour' | 'day' | 'week'>('hour');

  useEffect(() => {
    loadTimeSeriesData();
  }, [dateRange, groupBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTimeSeriesData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        groupBy: groupBy,
      });

      const response = await fetch(`/api/analytics/time-series?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error loading time series data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(context) {
            return context[0]?.parsed ? data?.timeSeries[context[0].dataIndex]?.label || '' : '';
          },
          label: function(context) {
            return `Orders: ${context.parsed.y}`;
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: groupBy === 'hour' ? 'Time' : groupBy === 'day' ? 'Date' : 'Week',
        },
        ticks: {
          maxTicksLimit: 10,
          callback: function(value, index) {
            if (!data?.timeSeries[index]) return '';
            const label = data.timeSeries[index].label;
            if (groupBy === 'hour') {
              // Show only time for hour view
              return label.split(' ').slice(-2).join(' ');
            }
            return label;
          },
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Number of Orders',
        },
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const chartData = {
    labels: data?.timeSeries.map(d => d.label) || [],
    datasets: [
      {
        label: 'Orders',
        data: data?.timeSeries.map(d => d.count) || [],
        borderColor: 'rgb(245, 158, 11)', // amber-500
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointBackgroundColor: 'rgb(245, 158, 11)',
        pointBorderColor: 'rgb(217, 119, 6)', // amber-600
        pointHoverBackgroundColor: 'rgb(217, 119, 6)',
        pointHoverBorderColor: 'rgb(245, 158, 11)',
      },
    ],
  };

  const getDaysFromRange = () => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getQuickDateRange = (days: number) => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center mb-4 sm:mb-0">
          <TrendingUp className="h-5 w-5 text-amber-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Orders Over Time</h3>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Quick Date Ranges */}
          <div className="flex gap-2">
            {[
              { label: '24h', days: 1 },
              { label: '7d', days: 7 },
              { label: '30d', days: 30 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => setDateRange(getQuickDateRange(days))}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  getDaysFromRange() === days
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Group By */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'hour' | 'day' | 'week')}
            className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
          </select>
        </div>
      </div>

      {/* Date Range Inputs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center">
          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-amber-500 focus:border-amber-500"
          />
          <span className="mx-2 text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        
        <div className="text-sm text-gray-600 flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          {data?.totalOrders || 0} total orders
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 mb-6">
        {data?.timeSeries.length ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No data available for selected date range</p>
            </div>
          </div>
        )}
      </div>

      {/* Busy Hours Summary */}
      {groupBy === 'hour' && data?.busyHours && data.busyHours.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">🕐 Busiest Hours</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {data.busyHours.slice(0, 5).map((hour, index) => (
              <div
                key={hour.hour}
                className={`p-2 rounded-lg text-center ${
                  index === 0
                    ? 'bg-amber-100 border border-amber-300'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="text-xs font-medium text-gray-900">{hour.label}</div>
                <div className={`text-sm font-bold ${
                  index === 0 ? 'text-amber-800' : 'text-gray-700'
                }`}>
                  {hour.count} orders
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}