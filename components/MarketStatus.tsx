'use client';

import { format } from 'date-fns';

interface MarketStatusProps {
  data: any;
}

export default function MarketStatus({ data }: MarketStatusProps) {
  if (!data || !data.success) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          ⏰ <span>Market Status</span>
        </h2>
        <p className="text-gray-500 text-base">Loading market status...</p>
      </div>
    );
  }

  const { clock } = data;
  const isOpen = clock.isOpen;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8 hover:shadow-2xl transition-shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        ⏰ <span>Market Status</span>
      </h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center py-3">
          <span className="text-gray-600 font-medium text-base">Current Status</span>
          <span
            className={`font-bold px-4 py-2 rounded-full text-base ${
              isOpen
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg'
            }`}
          >
            {isOpen ? '● OPEN' : '● CLOSED'}
          </span>
        </div>
        {!isOpen && clock.nextOpen && (
          <div className="flex justify-between items-center py-3 bg-blue-50 -mx-4 px-4 rounded-lg">
            <span className="text-gray-700 font-medium text-base">Next Open</span>
            <span className="font-bold text-blue-700 text-base">
              {format(new Date(clock.nextOpen), 'MMM dd, yyyy HH:mm')}
            </span>
          </div>
        )}
        {isOpen && clock.nextClose && (
          <div className="flex justify-between items-center py-3 bg-orange-50 -mx-4 px-4 rounded-lg">
            <span className="text-gray-700 font-medium text-base">Closes At</span>
            <span className="font-bold text-orange-700 text-base">
              {format(new Date(clock.nextClose), 'HH:mm')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
