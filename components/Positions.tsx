'use client';

interface Position {
  symbol: string;
  qty: number;
  side: 'long' | 'short';
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  currentPrice: number;
}

interface PositionsData {
  success: boolean;
  positions: Position[];
}

interface PositionsProps {
  data: PositionsData;
}

export default function Positions({ data }: PositionsProps) {
  if (!data || !data.success) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          📈 <span>Current Positions</span>
        </h2>
        <p className="text-gray-500 text-base">Loading positions...</p>
      </div>
    );
  }

  const { positions } = data;

  if (positions.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          📈 <span>Current Positions</span>
        </h2>
        <p className="text-gray-500 text-base">No open positions</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        📈 <span>Current Positions</span>
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
            <tr>
              <th className="px-5 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-5 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Qty
              </th>
              <th className="px-5 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Side
              </th>
              <th className="px-5 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-5 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Market Value
              </th>
              <th className="px-5 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                P&L
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {positions.map((position: Position, idx: number) => (
              <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                <td className="px-5 py-4 font-bold text-base text-gray-900">{position.symbol}</td>
                <td className="px-5 py-4 font-semibold text-base text-gray-700">{position.qty}</td>
                <td className="px-5 py-4">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold uppercase ${
                      position.side === 'long'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {position.side}
                  </span>
                </td>
                <td className="px-5 py-4 font-semibold text-base text-gray-900">${position.currentPrice.toFixed(2)}</td>
                <td className="px-5 py-4 font-semibold text-base text-gray-900">${position.marketValue.toFixed(2)}</td>
                <td className="px-5 py-4">
                  <span
                    className={`font-bold text-base ${
                      position.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ${position.unrealizedPL.toFixed(2)} ({position.unrealizedPLPercent.toFixed(2)}%)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
