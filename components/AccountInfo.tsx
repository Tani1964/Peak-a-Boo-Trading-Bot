'use client';

type AccountData =
  | {
      success: true;
      account: {
        status: string;
        portfolioValue: number;
        cash: number;
        buyingPower: number;
        equity: number;
        dayTradeCount: number;
      };
    }
  | {
      success: false;
      account?: never;
    };

interface AccountInfoProps {
  data: AccountData;
}

export default function AccountInfo({ data }: AccountInfoProps) {
  if (!data || !data.success) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          💼 <span>Account Information</span>
        </h2>
        <p className="text-gray-500 text-base">Loading account data...</p>
      </div>
    );
  }

  const { account } = data;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8 hover:shadow-2xl transition-shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        💼 <span>Account Information</span>
      </h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium text-base">Status</span>
          <span className="font-bold text-green-600 capitalize text-base px-3 py-1 bg-green-50 rounded-full">
            {account.status}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600 font-medium text-base">Portfolio Value</span>
          <span className="font-bold text-2xl text-gray-900">
            ${account.portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 bg-gray-50 -mx-4 px-4 rounded-lg">
          <span className="text-gray-600 font-medium text-base">Cash Available</span>
          <span className="font-bold text-lg text-gray-900">
            ${account.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 bg-blue-50 -mx-4 px-4 rounded-lg">
          <span className="text-gray-700 font-medium text-base">Buying Power</span>
          <span className="font-bold text-lg text-blue-700">
            ${account.buyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-t border-gray-100">
          <span className="text-gray-600 font-medium text-base">Day Trade Count</span>
          <span className="font-bold text-lg text-gray-900">{account.dayTradeCount}</span>
        </div>
      </div>
    </div>
  );
}
