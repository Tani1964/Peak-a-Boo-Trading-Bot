'use client';

import useSWR from 'swr';
import { useTimezone } from '@/lib/timezone';
import { formatDateInTimezone } from '@/lib/date-utils';

interface TradeHistoryProps {
  symbol: string;
  refreshKey: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TradeHistory({ symbol, refreshKey }: TradeHistoryProps) {
  const { timezone } = useTimezone();
  const { data, error } = useSWR(
    `/api/trades?symbol=${symbol}&limit=20&refresh=${refreshKey}`,
    fetcher
  );

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">💰 Trade History</h2>
        <p className="text-red-500">Error loading trades</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">💰 Trade History</h2>
        <p className="text-gray-500">Loading trades...</p>
      </div>
    );
  }

  const trades = data.trades || [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">💰 Trade History</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {trades.length === 0 ? (
          <p className="text-gray-500">No trades yet</p>
        ) : (
          trades.map((trade: any) => (
            <div
              key={trade._id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      trade.side === 'buy'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {trade.side.toUpperCase()}
                  </span>
                  <span className="ml-2 text-sm font-semibold">
                    {trade.symbol}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDateInTimezone(trade.timestamp, timezone, 'MMM dd, HH:mm')}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-semibold">{trade.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold">${trade.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-semibold capitalize ${
                      trade.status === 'filled'
                        ? 'text-green-600'
                        : trade.status === 'pending'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {trade.status}
                  </span>
                </div>
                {trade.portfolioValue && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Portfolio:</span>
                    <span>${trade.portfolioValue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
