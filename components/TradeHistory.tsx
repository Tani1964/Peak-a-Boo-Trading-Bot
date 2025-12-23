'use client';

import useSWR from 'swr';
import { useTimezone } from '@/lib/timezone';
import { formatDateInTimezone } from '@/lib/date-utils';

interface TradeHistoryProps {
  symbol: string;
  refreshKey: number;
  refreshInterval?: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TradeHistory({ symbol, refreshKey, refreshInterval = 0 }: TradeHistoryProps) {
  const { timezone } = useTimezone();
  const { data, error } = useSWR(
    `/api/trades?symbol=${symbol}&limit=20&refresh=${refreshKey}`,
    fetcher,
    {
      refreshInterval: refreshInterval,
    }
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
          trades.map((trade: {
            _id: string;
            timestamp: string | Date;
            symbol: string;
            side: 'buy' | 'sell';
            quantity: number;
            price: number;
            status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'blocked';
            portfolioValue?: number;
            cash?: number;
            buyingPower?: number;
            equity?: number;
            totalValue?: number;
            profitLoss?: number;
            profitLossPercent?: number;
            orderId?: string;
            signalId?: string;
            rejectionReason?: string;
          }) => (
            <div
              key={trade._id}
              className="border-2 border-gray-200 rounded-xl p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all hover:border-blue-300"
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
                    {trade.side.toUpperCase()}
                  </span>
                  <span className="text-base font-bold text-gray-900">
                    {trade.symbol}
                  </span>
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  {formatDateInTimezone(trade.timestamp, timezone, 'MMM dd, HH:mm')}
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
                    className={`font-bold text-sm capitalize px-2 py-1 rounded ${
                      trade.status === 'filled'
                        ? 'text-green-700 bg-green-50'
                        : trade.status === 'pending'
                        ? 'text-yellow-700 bg-yellow-50'
                        : (trade.status === 'blocked' || trade.status === 'rejected')
                        ? 'text-red-700 bg-red-50'
                        : 'text-orange-700 bg-orange-50'
                    }`}
                  >
                    {trade.status}
                  </span>
                </div>
                {trade.rejectionReason && (
                  <div className="flex flex-col gap-1 pt-2 border-t border-gray-200">
                    <span className="text-gray-600 font-medium text-xs">Rejection Reason</span>
                    <span className="text-red-600 text-sm font-medium">{trade.rejectionReason}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium text-sm">Total Value</span>
                  <span className="font-bold text-base text-gray-900">
                    ${(trade.totalValue || trade.price * trade.quantity).toFixed(2)}
                  </span>
                </div>
                {trade.profitLoss !== undefined && trade.profitLoss !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium text-sm">Profit/Loss</span>
                    <span className={`font-bold text-base ${trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(2)}
                      {trade.profitLossPercent !== undefined && trade.profitLossPercent !== null && (
                        <span className="ml-2 text-sm">
                          ({trade.profitLossPercent >= 0 ? '+' : ''}{trade.profitLossPercent.toFixed(2)}%)
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {trade.portfolioValue && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium text-sm">Portfolio Value</span>
                    <span className="font-bold text-base text-gray-900">${trade.portfolioValue.toFixed(2)}</span>
                  </div>
                )}
                {trade.cash !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium text-sm">Cash</span>
                    <span className="font-bold text-sm text-gray-700">${trade.cash.toFixed(2)}</span>
                  </div>
                )}
                {trade.buyingPower !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium text-sm">Buying Power</span>
                    <span className="font-bold text-sm text-gray-700">${trade.buyingPower.toFixed(2)}</span>
                  </div>
                )}
                {trade.orderId && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-gray-600 font-medium text-xs">Order ID</span>
                    <span className="font-mono text-xs text-gray-500 truncate max-w-[200px]">{trade.orderId}</span>
                  </div>
                )}
                {!trade.orderId && (trade.status === 'blocked' || trade.status === 'rejected') && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-gray-500 font-medium text-xs">No Order ID (Trade Blocked/Rejected)</span>
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
