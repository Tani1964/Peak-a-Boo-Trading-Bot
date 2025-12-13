'use client';

import { format } from 'date-fns';
import useSWR from 'swr';

interface SignalHistoryProps {
  symbol: string;
  refreshKey: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SignalHistory({ symbol, refreshKey }: SignalHistoryProps) {
  const { data, error } = useSWR(
    `/api/strategy/analyze?symbol=${symbol}&limit=20&refresh=${refreshKey}`,
    fetcher
  );

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📊 Signal History</h2>
        <p className="text-red-500">Error loading signals</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📊 Signal History</h2>
        <p className="text-gray-500">Loading signals...</p>
      </div>
    );
  }

  const signals = data.signals || [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">📊 Signal History</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {signals.length === 0 ? (
          <p className="text-gray-500">No signals yet</p>
        ) : (
          signals.map((signal: any) => (
            <div
              key={signal._id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      signal.signal === 'BUY'
                        ? 'bg-green-100 text-green-800'
                        : signal.signal === 'SELL'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {signal.signal}
                  </span>
                  {signal.executed && (
                    <span className="ml-2 text-xs text-green-600 font-semibold">
                      ✓ Executed
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {format(new Date(signal.timestamp), 'MMM dd, HH:mm')}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold">${signal.closePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">RSI:</span>
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
