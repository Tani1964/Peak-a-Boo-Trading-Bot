"use client";


import AccountInfo from '@/components/AccountInfo';
import DataStatistics from '@/components/DataStatistics';
import MarketStatus from '@/components/MarketStatus';
import PerformanceGraph from '@/components/PerformanceGraph';
import SymbolSelector from '@/components/SymbolSelector';
import TradeSummaryCard from '@/components/TradeSummaryCard';
import { useState } from 'react';
import useSWR from 'swr';



export default function DashboardPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: accountData, error: _accountError } = useSWR('/api/account', url => fetch(url).then(res => res.json()));
  const { data: marketData, error: _marketError } = useSWR('/api/market/status', url => fetch(url).then(res => res.json()));

  // Update refreshKey when symbol changes
  const handleSymbolChange = (newSymbol: string) => {
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
