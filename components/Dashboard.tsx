'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import AccountInfo from './AccountInfo';
import MarketStatus from './MarketStatus';
import Positions from './Positions';
import SignalHistory from './SignalHistory';
import StrategyControl from './StrategyControl';
import TradeHistory from './TradeHistory';

interface DashboardProps {
  symbol: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Dashboard({ symbol }: DashboardProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: accountData } = useSWR(
    `/api/account?refresh=${refreshKey}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const { data: positionsData } = useSWR(
    `/api/positions?refresh=${refreshKey}`,
    fetcher,
    {
      refreshInterval: 30000,
    }
  );

  const { data: marketData } = useSWR('/api/market/status', fetcher, {
    refreshInterval: 60000, // Refresh every minute
  });

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Top Section: Account & Market Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AccountInfo data={accountData} />
          <MarketStatus data={marketData} />
        </div>

        {/* Strategy Control */}
        <StrategyControl symbol={symbol} onRefresh={handleRefresh} />

        {/* Positions */}
        <Positions data={positionsData} />

        {/* History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SignalHistory symbol={symbol} refreshKey={refreshKey} />
          <TradeHistory symbol={symbol} refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
