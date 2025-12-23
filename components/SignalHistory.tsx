'use client';

import useSWR from 'swr';
import { useTimezone } from '@/lib/timezone';
import { formatDateInTimezone } from '@/lib/date-utils';

interface SignalHistoryProps {
  symbol: string;
  refreshKey: number;
  refreshInterval?: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SignalHistory({ symbol, refreshKey, refreshInterval = 0 }: SignalHistoryProps) {
  const { timezone } = useTimezone();
  const { data, error } = useSWR(
    `/api/strategy/analyze?symbol=${symbol}&limit=20&refresh=${refreshKey}`,
    fetcher,
    {
      refreshInterval: refreshInterval,
    }
  );

  if (error) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          📊 <span>Signal History</span>
        </h2>
        <p className="text-red-500 font-semibold text-base">Error loading signals</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          📊 <span>Signal History</span>
        </h2>
        <p className="text-gray-500 text-base">Loading signals...</p>
      </div>
    );
  }

  const signals = data.signals || [];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        📊 <span>Signal History</span>
      </h2>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {signals.length === 0 ? (
          <p className="text-gray-500 text-base">No signals yet</p>
        ) : (
          signals.map((signal: any) => (
            <div
              key={signal._id}
              className="border-2 border-gray-200 rounded-xl p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all hover:border-blue-300"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block px-3 py-1.5 rounded-lg text-sm font-black uppercase ${
                      signal.signal === 'BUY'
                        ? 'bg-green-500 text-white'
                        : signal.signal === 'SELL'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-500 text-white'
                    }`}
                  >
                    {signal.signal}
                  </span>
                  {signal.executed && (
                    <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                      ✓ Executed
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  {formatDateInTimezone(signal.timestamp, timezone, 'MMM dd, HH:mm')}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium text-sm">Price</span>
                  <span className="font-bold text-base text-gray-900">${signal.closePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium text-sm">RSI</span>
                  <span>{signal.rsi.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MACD:</span>
                  <span>{signal.macd.toFixed(4)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
