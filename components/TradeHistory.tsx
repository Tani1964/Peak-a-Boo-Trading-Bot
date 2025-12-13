'use client';

import { format } from 'date-fns';
import useSWR from 'swr';

interface TradeHistoryProps {
  symbol: string;
  refreshKey: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TradeHistory({ symbol, refreshKey }: TradeHistoryProps) {
  const { data, error } = useSWR(
    `/api/trades?symbol=${symbol}&limit=20&refresh=${refreshKey}`,
    fetcher
  );

  if (error) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          💰 <span>Trade History</span>
        </h2>
        <p className="text-red-500 font-semibold text-base">Error loading trades</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          💰 <span>Trade History</span>
        </h2>
        <p className="text-gray-500 text-base">Loading trades...</p>
      </div>
    );
  }

  const trades = data.trades || [];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        💰 <span>Trade History</span>
      </h2>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {trades.length === 0 ? (
          <p className="text-gray-500 text-base">No trades yet</p>
        ) : (
          trades.map((trade: any) => (
            <div
              key={trade._id}
              className="border-2 border-gray-200 rounded-xl p-4 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all hover:border-green-300"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block px-3 py-1.5 rounded-lg text-sm font-black uppercase ${
                      trade.side === 'buy'
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {trade.side}
                  </span>
                  <span className="text-base font-bold text-gray-900">
                    {trade.symbol}
                  </span>
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  {format(new Date(trade.timestamp), 'MMM dd, HH:mm')}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium text-sm">Quantity</span>
                  <span className="font-bold text-base text-gray-900">{trade.quantity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium text-sm">Price</span>
                  <span className="font-bold text-base text-gray-900">${trade.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium text-sm">Status</span>
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
