'use client';

import { createTimeInTimezone, formatDateInTimezone } from '@/lib/date-utils';
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

  // Get today's date components in ET timezone
  const nowETString = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nowET = new Date(nowETString);
  const year = nowET.getFullYear();
  const month = nowET.getMonth() + 1; // getMonth() returns 0-11
  const day = nowET.getDate();
  
  // Create market open (9:30 AM ET) and close (4:00 PM ET) times for today
  // We create these as Date objects representing those times in ET
  let marketOpenET: Date;
  let marketCloseET: Date;
  
  try {
    marketOpenET = createTimeInTimezone(year, month, day, 9, 30, 'America/New_York');
    marketCloseET = createTimeInTimezone(year, month, day, 16, 0, 'America/New_York');
  } catch {
    // Fallback: use a simpler approach if the function fails
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    marketOpenET = new Date(`${todayStr}T09:30:00-05:00`); // ET is UTC-5
    marketCloseET = new Date(`${todayStr}T16:00:00-05:00`);
  }

  // Format these times in the selected timezone
  const marketOpenInTZ = formatDateInTimezone(marketOpenET, timezone, 'HH:mm');
  const marketCloseInTZ = formatDateInTimezone(marketCloseET, timezone, 'HH:mm');

  // Get timezone abbreviation
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
        
        <div className="bg-gray-50 -mx-4 px-4 py-3 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Current Time ({tzAbbr})</div>
          <div className="text-sm font-semibold text-gray-700">
            {formatDateInTimezone(currentTime, timezone, 'MMM dd, yyyy HH:mm:ss')}
          </div>
        </div>

        <div className="bg-blue-50 -mx-4 px-4 py-3 rounded-lg border border-blue-200">
          <div className="text-xs text-gray-600 font-medium mb-2">Regular Market Hours (ET)</div>
          <div className="text-xs text-gray-700 space-y-1">
            <div><span className="font-semibold">Open:</span> {marketOpenInTZ} ({tzAbbr}) = 9:30 AM (ET)</div>
            <div><span className="font-semibold">Close:</span> {marketCloseInTZ} ({tzAbbr}) = 4:00 PM (ET)</div>
          </div>
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-blue-200">
            Market status is based on US Eastern Time, regardless of selected timezone
          </div>
        </div>

        {!isOpen && clock?.nextOpen && (
          <div className="flex justify-between items-center py-3 bg-blue-50 -mx-4 px-4 rounded-lg">
            <span className="text-gray-700 font-medium text-base">Next Open</span>
            <span className="font-bold text-blue-700 text-base">
              {formatDateInTimezone(clock.nextOpen, timezone, 'MMM dd, yyyy HH:mm')}
            </span>
          </div>
        )}
        {isOpen && clock?.nextClose && (
          <div className="flex justify-between items-center py-3 bg-orange-50 -mx-4 px-4 rounded-lg">
            <span className="text-gray-700 font-medium text-base">Closes At</span>
            <span className="font-bold text-orange-700 text-base">
              {formatDateInTimezone(clock.nextClose, timezone, 'HH:mm')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
