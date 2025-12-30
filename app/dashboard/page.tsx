

"use client";
import AccountInfo from '@/components/AccountInfo';
import dynamic from 'next/dynamic';

const PerformanceGraph = dynamic(
  () => import('@/components/PerformanceGraph'),
  { ssr: false }
);

const DataStatistics = dynamic(
  () => import('@/components/DataStatistics'),
  { ssr: false }
);

import MarketStatus from '@/components/MarketStatus';
import SymbolSelector from '@/components/SymbolSelector';
import TradeSummaryCard from '@/components/TradeSummaryCard';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [refreshKey, setRefreshKey] = useState(0);
  const [accountData, setAccountData] = useState<any>({ success: false });
  const [marketData, setMarketData] = useState<any>({ success: false });

  useEffect(() => {
    async function fetchAccountData() {
      const res = await fetch('/api/account');
      setAccountData(await res.json());
    }
    async function fetchMarketData() {
      const res = await fetch('/api/market/status');
      setMarketData(await res.json());
    }
    fetchAccountData();
    fetchMarketData();
  }, []);

  const handleSymbolChange = (newSymbol:any) => {
    setSymbol(newSymbol);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-8">
      <SymbolSelector value={symbol} onChange={handleSymbolChange} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AccountInfo data={accountData} />
        <MarketStatus data={marketData} />
      </div>
      <TradeSummaryCard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PerformanceGraph symbol={symbol} refreshKey={refreshKey} />
        <DataStatistics symbol={symbol} refreshKey={refreshKey} />
      </div>
    </div>
  );
}
