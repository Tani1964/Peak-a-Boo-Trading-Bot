'use client';

import { formatDateInTimezone } from '@/lib/date-utils';
import { useTimezone } from '@/lib/timezone';
import { formatInTimeZone } from 'date-fns-tz';
import { useEffect, useState } from 'react';

interface MarketStatusData {
  success: boolean;
  clock?: {
    isOpen: boolean;
    nextOpen?: string;
    nextClose?: string;
  };
}

interface MarketStatusProps {
  data: MarketStatusData;
}

export default function MarketStatus({ data }: MarketStatusProps) {
  const { timezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
  const isOpen = clock?.isOpen ?? false;
  const nextOpen = clock?.nextOpen ? new Date(clock.nextOpen) : null;
  const nextClose = clock?.nextClose ? new Date(clock.nextClose) : null;

  // Format next open/close in user's timezone
  const nextOpenStr = nextOpen ? formatDateInTimezone(nextOpen, timezone, "MMM dd, HH:mm zzz") : null;
  const nextCloseStr = nextClose ? formatDateInTimezone(nextClose, timezone, "MMM dd, HH:mm zzz") : null;
  const tzAbbr = timezone === 'America/New_York' ? 'ET' : formatInTimeZone(currentTime, timezone, 'zzz');

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
        <div className="flex justify-between items-center py-3">
          <span className="text-gray-600 font-medium text-base">Timezone</span>
          <span className="font-mono text-base">{tzAbbr}</span>
        </div>
        {!isOpen && nextOpenStr && (
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600 font-medium text-base">Next Market Open</span>
            <span className="font-mono text-base">{nextOpenStr}</span>
          </div>
        )}
        {isOpen && nextCloseStr && (
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600 font-medium text-base">Next Market Close</span>
            <span className="font-mono text-base">{nextCloseStr}</span>
          </div>
        )}
        {!isOpen && (
          <div className="text-yellow-700 bg-yellow-100 rounded p-3 text-sm mt-2">
            The market is currently closed. This may be due to a holiday or outside regular hours. Please check the next open time above.
          </div>
        )}
        <div className="bg-gray-50 -mx-4 px-4 py-3 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Current Time ({tzAbbr})</div>
          <div className="text-sm font-semibold text-gray-700">
            {formatDateInTimezone(currentTime, timezone, 'MMM dd, yyyy HH:mm:ss')}
          </div>
        </div>
        <div className="bg-blue-50 -mx-4 px-4 py-3 rounded-lg border border-blue-200">
          <div className="text-xs text-gray-600 font-medium mb-2">Regular Market Hours (ET)</div>
          <div className="text-xs text-gray-700 space-y-1">
            <div><span className="font-semibold">Open:</span> 9:30 AM (ET)</div>
            <div><span className="font-semibold">Close:</span> 4:00 PM (ET)</div>
          </div>
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-blue-200">
            Market status is based on US Eastern Time, regardless of selected timezone
          </div>
        </div>
      </div>
    </div>
  );
}
