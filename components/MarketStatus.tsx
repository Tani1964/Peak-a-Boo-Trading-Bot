'use client';

import { format } from 'date-fns';

interface MarketStatusProps {
  data: any;
}

export default function MarketStatus({ data }: MarketStatusProps) {
  if (!data || !data.success) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">⏰ Market Status</h2>
        <p className="text-gray-500">Loading market status...</p>
      </div>
    );
  }

  const { clock } = data;
  const isOpen = clock.isOpen;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">⏰ Market Status</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Status:</span>
          <span
            className={`font-semibold px-3 py-1 rounded-full text-sm ${
              isOpen
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {isOpen ? '● Open' : '● Closed'}
          </span>
        </div>
        {!isOpen && clock.nextOpen && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Next Open:</span>
            <span className="font-semibold">
              {format(new Date(clock.nextOpen), 'MMM dd, yyyy HH:mm')}
            </span>
          </div>
        )}
        {isOpen && clock.nextClose && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Next Close:</span>
            <span className="font-semibold">
              {format(new Date(clock.nextClose), 'HH:mm')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
