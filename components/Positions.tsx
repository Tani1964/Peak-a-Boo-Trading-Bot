'use client';

interface PositionsProps {
  data: any;
}

export default function Positions({ data }: PositionsProps) {
  if (!data || !data.success) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📈 Current Positions</h2>
        <p className="text-gray-500">Loading positions...</p>
      </div>
    );
  }

  const { positions } = data;

  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📈 Current Positions</h2>
        <p className="text-gray-500">No open positions</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">📈 Current Positions</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Symbol
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Qty
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Side
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Current Price
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Market Value
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                P&L
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {positions.map((position: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{position.symbol}</td>
                <td className="px-4 py-3">{position.qty}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      position.side === 'long'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {position.side}
                  </span>
                </td>
                <td className="px-4 py-3">${position.currentPrice.toFixed(2)}</td>
                <td className="px-4 py-3">${position.marketValue.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`font-semibold ${
                      position.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ${position.unrealizedPL.toFixed(2)} (
                    {position.unrealizedPLPercent.toFixed(2)}%)
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
