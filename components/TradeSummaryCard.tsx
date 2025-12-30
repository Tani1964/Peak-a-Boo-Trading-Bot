
'use client';
import useSWR from 'swr';

const TradeSummaryCard = () => {
  const { data, error, isLoading } = useSWR('/api/trades/summary', (url) => fetch(url).then(res => res.json()));

  if (isLoading) {
    return <div className="bg-white rounded-lg shadow-md p-6 mb-4">Loading trade summary...</div>;
  }
  if (error || !data) {
    return <div className="bg-white rounded-lg shadow-md p-6 mb-4 text-red-600">Failed to load trade summary.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <h2 className="text-xl font-bold mb-2">Trades (Last 24 Hours)</h2>
      <div className="mb-2 font-semibold">Total: {data.count}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1">Time</th>
              <th className="px-2 py-1">Symbol</th>
              <th className="px-2 py-1">Side</th>
              <th className="px-2 py-1">Qty</th>
              <th className="px-2 py-1">Price</th>
              <th className="px-2 py-1">Status</th>
              <th className="px-2 py-1">P/L</th>
              <th className="px-2 py-1">P/L %</th>
              <th className="px-2 py-1">Order ID</th>
            </tr>
          </thead>
          <tbody>
            {data.trades.map((t: {
              timestamp: string;
              symbol: string;
              side: string;
              quantity: number;
              price: number;
              status: string;
              profitLoss?: number;
              profitLossPercent?: number;
              orderId?: string;
            }, idx: number) => (
              <tr key={idx} className="border-b">
                <td className="px-2 py-1 whitespace-nowrap">{new Date(t.timestamp).toLocaleString()}</td>
                <td className="px-2 py-1">{t.symbol}</td>
                <td className="px-2 py-1 uppercase font-bold" style={{ color: t.side === 'buy' ? '#16a34a' : '#dc2626' }}>{t.side}</td>
                <td className="px-2 py-1">{t.quantity}</td>
                <td className="px-2 py-1">${t.price}</td>
                <td className="px-2 py-1">{t.status}</td>
                <td className="px-2 py-1">{t.profitLoss !== undefined ? t.profitLoss : '-'}</td>
                <td className="px-2 py-1">{t.profitLossPercent !== undefined ? t.profitLossPercent + '%' : '-'}</td>
                <td className="px-2 py-1 text-xs">{t.orderId || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeSummaryCard;
