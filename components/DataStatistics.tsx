'use client';

import useSWR from 'swr';
import { useTimezone } from '@/lib/timezone';
import { formatDateInTimezone } from '@/lib/date-utils';

interface DataStatisticsProps {
  symbol?: string;
  refreshKey: number;
  refreshInterval?: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DataStatistics({ symbol, refreshKey, refreshInterval = 0 }: DataStatisticsProps) {
  const { timezone } = useTimezone();
  const queryParams = symbol ? `?symbol=${symbol}&refresh=${refreshKey}` : `?refresh=${refreshKey}`;
  const { data, error } = useSWR(
    `/api/statistics${queryParams}`,
    fetcher,
    {
      refreshInterval: refreshInterval,
    }
  );

  if (error) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          📊 <span>Data Statistics</span>
        </h2>
        <p className="text-red-500 font-semibold text-base">Error loading statistics</p>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          📊 <span>Data Statistics</span>
        </h2>
        <p className="text-gray-500 text-base">Loading statistics...</p>
      </div>
    );
  }

  const { statistics } = data;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8 hover:shadow-2xl transition-shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        📊 <span>Data Statistics</span>
      </h2>
      <div className="space-y-6">
        {/* Trades Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            💰 Trades
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Trades</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.trades.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Filled Trades</p>
              <p className="text-2xl font-bold text-green-600">{statistics.trades.filled.toLocaleString()}</p>
            </div>
          </div>
          {statistics.trades.dateRange.oldest && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Date Range</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDateInTimezone(statistics.trades.dateRange.oldest, timezone, 'MMM dd, yyyy')} - {formatDateInTimezone(statistics.trades.dateRange.newest, timezone, 'MMM dd, yyyy')}
              </p>
            </div>
          )}
          {statistics.trades.bySymbol && statistics.trades.bySymbol.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs text-gray-600 mb-2">By Symbol</p>
              <div className="flex flex-wrap gap-2">
                {statistics.trades.bySymbol.slice(0, 5).map((item: any) => (
                  <span
                    key={item._id}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold"
                  >
                    {item._id}: {item.count}
                  </span>
                ))}
                {statistics.trades.bySymbol.length > 5 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    +{statistics.trades.bySymbol.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Signals Section */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            📈 Signals
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Signals</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.signals.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Executed Signals</p>
              <p className="text-2xl font-bold text-green-600">{statistics.signals.executed.toLocaleString()}</p>
            </div>
          </div>
          {statistics.signals.dateRange.oldest && (
            <div className="mt-4 pt-4 border-t border-purple-200">
              <p className="text-xs text-gray-600 mb-1">Date Range</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDateInTimezone(statistics.signals.dateRange.oldest, timezone, 'MMM dd, yyyy')} - {formatDateInTimezone(statistics.signals.dateRange.newest, timezone, 'MMM dd, yyyy')}
              </p>
            </div>
          )}
          {statistics.signals.bySymbol && statistics.signals.bySymbol.length > 0 && (
            <div className="mt-4 pt-4 border-t border-purple-200">
              <p className="text-xs text-gray-600 mb-2">By Symbol</p>
              <div className="flex flex-wrap gap-2">
                {statistics.signals.bySymbol.slice(0, 5).map((item: any) => (
                  <span
                    key={item._id}
                    className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold"
                  >
                    {item._id}: {item.count}
                  </span>
                ))}
                {statistics.signals.bySymbol.length > 5 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    +{statistics.signals.bySymbol.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Snapshots Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            💾 Account Snapshots
          </h3>
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Snapshots</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.snapshots.total.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

