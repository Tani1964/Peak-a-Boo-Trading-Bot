'use client';

import { strategyApproach, strategyPlan, strategyReason } from '@/lib/strategy-text';
import { TIMEZONES, useTimezone } from '@/lib/timezone';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import useSWR from 'swr';
import AccountInfo from './AccountInfo';
import CurrentStrategyCard from './CurrentStrategyCard';
import DataStatistics from './DataStatistics';
import MarketStatus from './MarketStatus';
import Positions from './Positions';
import SignalHistory from './SignalHistory';
import StrategyCard from './StrategyCard';
import StrategyControl from './StrategyControl';
import TradeHistory from './TradeHistory';
import TradeSummaryCard from './TradeSummaryCard';
import UpdatePendingTradesButton from './UpdatePendingTradesButton';
import YouTubeStrategyExtractor from './YouTubeStrategyExtractor';

const PerformanceGraph = dynamic(() => import('./PerformanceGraph'), {
  ssr: false,
});

interface DashboardProps {
  symbol: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Refresh interval options in milliseconds
const REFRESH_INTERVALS = [
  { label: '10 seconds', value: 10000 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '5 minutes', value: 300000 },
  { label: '10 minutes', value: 600000 },
  { label: 'Manual (No auto-refresh)', value: 0 },
];

export default function Dashboard({ symbol }: DashboardProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState(30000); // Default: 30 seconds
  const { timezone, setTimezone } = useTimezone();

  const { data: accountData } = useSWR(
    `/api/account?refresh=${refreshKey}`,
    fetcher,
    {
      refreshInterval: refreshInterval,
    }
  );

  const { data: positionsData } = useSWR(
    `/api/positions?refresh=${refreshKey}`,
    fetcher,
    {
      refreshInterval: refreshInterval,
    }
  );

  const { data: marketData } = useSWR('/api/market/status', fetcher, {
    refreshInterval: refreshInterval > 0 ? refreshInterval * 2 : 0, // Market status refreshes at 2x interval
  });

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleIntervalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshInterval(Number(event.target.value));
  };

  const handleTimezoneChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTimezone(event.target.value);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Strategy Card */}
        <StrategyCard plan={strategyPlan} approach={strategyApproach} reason={strategyReason} />
        {/* Current Strategy Card */}
        <CurrentStrategyCard />
        {/* Update Pending Trades Button */}
        <UpdatePendingTradesButton />
        {/* Trade Summary Card */}
        <TradeSummaryCard />
        {/* Trading Time Controls */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌍</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Trading Time</h3>
                <p className="text-sm text-gray-600">Select timezone for displaying dates and times</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={timezone}
                onChange={handleTimezoneChange}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:border-gray-400 transition-colors"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Auto-Refresh Control */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏱️</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Auto-Refresh Interval</h3>
                <p className="text-sm text-gray-600">Control how often data updates automatically</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={refreshInterval}
                onChange={handleIntervalChange}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:border-gray-400 transition-colors"
              >
                {REFRESH_INTERVALS.map((interval) => (
                  <option key={interval.value} value={interval.value}>
                    {interval.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleRefresh}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                🔄 Refresh Now
              </button>
            </div>
          </div>
        </div>

        {/* Top Section: Account & Market Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AccountInfo data={accountData} />
          <MarketStatus data={marketData} />
        </div>

        {/* Strategy Control */}
        <StrategyControl symbol={symbol} onRefresh={handleRefresh} />

        {/* YouTube Strategy Extractor */}
        <YouTubeStrategyExtractor />

        {/* Positions */}
        <Positions data={positionsData} />

        {/* Data Statistics */}
        <DataStatistics symbol={symbol} refreshKey={refreshKey} refreshInterval={refreshInterval} />

        {/* Performance Graph */}
        <PerformanceGraph symbol={symbol} refreshKey={refreshKey} refreshInterval={refreshInterval} />

        {/* History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SignalHistory symbol={symbol} refreshKey={refreshKey} refreshInterval={refreshInterval} />
          <TradeHistory symbol={symbol} refreshKey={refreshKey} refreshInterval={refreshInterval} />
        </div>
      </div>
    </div>
  );
}
