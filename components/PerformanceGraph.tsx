'use client';

import useSWR from 'swr';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useTimezone } from '@/lib/timezone';
import { formatDateInTimezone } from '@/lib/date-utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
  days = 30 
}: PerformanceGraphProps) {
  const { timezone } = useTimezone();
  const { data, error } = useSWR(
    `/api/performance?symbol=${symbol}&days=${days}&refresh=${refreshKey}`,
    fetcher,
    {
      refreshInterval: refreshInterval,
    }
  );

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
  const portfolioLabels = chartData.portfolio.map((d: PortfolioDataPoint) =>
    formatDateInTimezone(d.timestamp, timezone, 'MMM dd, HH:mm')
  );
  const portfolioData = {
    labels: portfolioLabels,
    datasets: [
      {
        label: 'Portfolio Value',
        data: chartData.portfolio.map((d: PortfolioDataPoint) => d.portfolioValue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        label: 'Equity',
        data: chartData.portfolio.map((d: PortfolioDataPoint) => d.equity),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
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
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        beginAtZero: false,
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
            <h3 className="text-lg font-bold mb-4 text-gray-900">Portfolio Value Over Time</h3>
            <div className="h-64">
              <Line data={portfolioData} options={chartOptions} />
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

