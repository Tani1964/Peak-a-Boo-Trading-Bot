'use client';

import { formatDateInTimezone } from '@/lib/date-utils';
import { useTimezone } from '@/lib/timezone';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import { useEffect, useRef } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import useSWR from 'swr';


interface PerformanceGraphProps {
  symbol: string;
  refreshKey: number;
  refreshInterval?: number;
  days?: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PerformanceGraph({ 
  symbol, 
  refreshKey, 
  refreshInterval = 0,
  days = 3650 // Default to 10 years to fetch all available data
}: PerformanceGraphProps) {
    useEffect(() => {
      if (typeof window !== 'undefined') {
        ChartJS.register(
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          BarElement,
          Title,
          Tooltip,
          Legend,
          Filler,
          TimeScale,
          zoomPlugin
        );
      }
    }, []);
  const { timezone } = useTimezone();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const portfolioChartRef = useRef<any>(null);
  const { data, error } = useSWR(
    `/api/performance?symbol=${symbol}&days=${days}&refresh=${refreshKey}`,
    fetcher,
    {
      refreshInterval: refreshInterval,
    }
  );

  const handleResetZoom = () => {
    if (portfolioChartRef.current) {
      const chart = portfolioChartRef.current;
      // Access the Chart.js instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chartInstance = (chart as any).chartInstance || (chart as any);
      if (chartInstance && typeof chartInstance.resetZoom === 'function') {
        chartInstance.resetZoom();
      }
    }
  };

  if (error) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          📈 <span>Performance Analytics</span>
        </h2>
        <p className="text-red-500 font-semibold text-base">Error loading performance data</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          📈 <span>Performance Analytics</span>
        </h2>
        <p className="text-gray-500 text-base">Loading performance data...</p>
      </div>
    );
  }

  const { metrics, chartData } = data;

  // Portfolio value chart
  interface PortfolioDataPoint {
    timestamp: string | Date;
    portfolioValue: number;
    equity: number;
    cash: number;
  }
  
  // Convert timestamps to Date objects for proper time scale handling
  const portfolioDataPoints = chartData.portfolio.map((d: PortfolioDataPoint) => ({
    x: new Date(d.timestamp),
    y: d.portfolioValue,
  }));
  
  const equityDataPoints = chartData.portfolio.map((d: PortfolioDataPoint) => ({
    x: new Date(d.timestamp),
    y: d.equity,
  }));
  
  const portfolioData = {
    datasets: [
      {
        label: 'Portfolio Value',
        data: portfolioDataPoints,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#ffffff',
      },
      {
        label: 'Equity',
        data: equityDataPoints,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: '#22c55e',
        pointHoverBorderColor: '#ffffff',
      },
    ],
  };

  // Trade P&L chart
  interface TradeDataPoint {
    timestamp: string | Date;
    symbol: string;
    side: string;
    price: number;
    quantity: number;
    totalValue?: number;
    profitLoss?: number;
    profitLossPercent?: number;
  }
  const tradeLabels = chartData.trades.map((d: TradeDataPoint) =>
    formatDateInTimezone(d.timestamp, timezone, 'MMM dd, HH:mm')
  );
  const tradeData = {
    labels: tradeLabels,
    datasets: [
      {
        label: 'Profit/Loss',
        data: chartData.trades.map((d: TradeDataPoint) => d.profitLoss || 0),
        backgroundColor: chartData.trades.map((d: TradeDataPoint) =>
          (d.profitLoss || 0) >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: chartData.trades.map((d: TradeDataPoint) =>
          (d.profitLoss || 0) >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 1,
      },
    ],
  };

  // Signal distribution chart
  const signalData = {
    labels: ['BUY', 'SELL', 'HOLD'],
    datasets: [
      {
        label: 'Signals',
        data: [metrics.buySignals, metrics.sellSignals, metrics.holdSignals],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 600,
          },
          color: '#1f2937',
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        titleFont: {
          size: 13,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
        titleColor: '#f9fafb',
        bodyColor: '#f9fafb',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          title: (tooltipItems: any[]) => {
            const date = new Date(tooltipItems[0].parsed.x);
            return formatDateInTimezone(date, timezone, 'MMM dd, yyyy HH:mm');
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: $${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          },
        },
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x' as const,
        },
        pan: {
          enabled: true,
          mode: 'x' as const,
          threshold: 10,
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            millisecond: 'HH:mm:ss',
            second: 'HH:mm:ss',
            minute: 'HH:mm',
            hour: 'MMM dd HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
            quarter: 'MMM yyyy',
            year: 'yyyy',
          },
          tooltipFormat: 'MMM dd, yyyy HH:mm',
        },
        display: true,
        grid: {
          display: true,
          color: 'rgba(229, 231, 235, 0.5)',
          lineWidth: 1,
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            weight: 500,
          },
          padding: 8,
        },
        border: {
          display: true,
          color: '#e5e7eb',
          width: 1,
        },
      },
      y: {
        display: true,
        beginAtZero: false,
        position: 'right' as const,
        grid: {
          display: true,
          color: 'rgba(229, 231, 235, 0.5)',
          lineWidth: 1,
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            weight: 500,
          },
          padding: 8,
          callback: function(value: number | string) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            return '$' + numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          },
        },
        border: {
          display: true,
          color: '#e5e7eb',
          width: 1,
        },
      },
    },
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        📈 <span>Performance Analytics</span>
      </h2>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
          <div className="text-sm font-medium text-blue-700 mb-1">Portfolio Return</div>
          <div className="text-2xl font-bold text-blue-900">
            {metrics.portfolioReturnPercent >= 0 ? '+' : ''}
            {metrics.portfolioReturnPercent.toFixed(2)}%
          </div>
          <div className="text-xs text-blue-600 mt-1">
            ${metrics.portfolioReturn >= 0 ? '+' : ''}
            {metrics.portfolioReturn.toFixed(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
          <div className="text-sm font-medium text-green-700 mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-green-900">{metrics.winRate.toFixed(1)}%</div>
          <div className="text-xs text-green-600 mt-1">
            {metrics.winningTrades}W / {metrics.losingTrades}L
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
          <div className="text-sm font-medium text-purple-700 mb-1">Total Trades</div>
          <div className="text-2xl font-bold text-purple-900">{metrics.totalTrades}</div>
          <div className="text-xs text-purple-600 mt-1">
            {metrics.buyTrades} Buy / {metrics.sellTrades} Sell
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-200">
          <div className="text-sm font-medium text-orange-700 mb-1">Total Signals</div>
          <div className="text-2xl font-bold text-orange-900">{metrics.totalSignals}</div>
          <div className="text-xs text-orange-600 mt-1">
            {metrics.executionRate.toFixed(1)}% Executed
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-8">
        {/* Portfolio Value Chart */}
        {chartData.portfolio.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              <h3 className="text-lg font-bold text-gray-900">Portfolio Value Over Time</h3>
              <button
                onClick={handleResetZoom}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                🔍 Reset Zoom
              </button>
            </div>
            <div className="h-[600px] bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <Line 
                ref={portfolioChartRef}
                data={portfolioData} 
                options={chartOptions} 
              />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              💡 Use mouse wheel to zoom, click and drag to pan
            </div>
          </div>
        )}

        {/* Trade P&L Chart */}
        {chartData.trades.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900">Trade Profit/Loss</h3>
            <div className="h-64">
              <Bar data={tradeData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Signal Distribution Chart */}
        {metrics.totalSignals > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900">Signal Distribution</h3>
            <div className="h-64">
              <Bar data={signalData} options={chartOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Additional Stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
        <div>
          <div className="text-sm text-gray-600 mb-1">Current Portfolio Value</div>
          <div className="text-lg font-bold text-gray-900">
            ${metrics.currentPortfolioValue.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Total P&L</div>
          <div className={`text-lg font-bold ${metrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${metrics.totalProfitLoss >= 0 ? '+' : ''}{metrics.totalProfitLoss.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Avg RSI</div>
          <div className="text-lg font-bold text-gray-900">{metrics.avgRSI.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

