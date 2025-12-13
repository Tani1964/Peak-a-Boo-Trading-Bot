'use client';

interface AccountInfoProps {
  data: any;
}

export default function AccountInfo({ data }: AccountInfoProps) {
  if (!data || !data.success) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">💼 Account Information</h2>
        <p className="text-gray-500">Loading account data...</p>
      </div>
    );
  }

  const { account } = data;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">💼 Account Information</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Status:</span>
          <span className="font-semibold text-green-600 capitalize">
            {account.status}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Portfolio Value:</span>
          <span className="font-semibold text-lg">
            ${account.portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Cash:</span>
          <span className="font-semibold">
            ${account.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Buying Power:</span>
          <span className="font-semibold">
            ${account.buyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Day Trade Count:</span>
          <span className="font-semibold">{account.dayTradeCount}</span>
        </div>
      </div>
    </div>
  );
}
