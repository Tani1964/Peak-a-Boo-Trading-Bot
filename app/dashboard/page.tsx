"use client";


import useSWR from 'swr';
import AccountInfo from '@/components/AccountInfo';
import DataStatistics from '@/components/DataStatistics';
import MarketStatus from '@/components/MarketStatus';
import PerformanceGraph from '@/components/PerformanceGraph';
import SymbolSelector from '@/components/SymbolSelector';
import TradeSummaryCard from '@/components/TradeSummaryCard';
import { useState } from 'react';



export default function DashboardPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const { data: accountData, error: accountError } = useSWR('/api/account', url => fetch(url).then(res => res.json()));
  const { data: marketData, error: marketError } = useSWR('/api/market/status', url => fetch(url).then(res => res.json()));

  return (
    <div className="space-y-8">
      <SymbolSelector value={symbol} onChange={setSymbol} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AccountInfo data={accountData} />
        <MarketStatus data={marketData} />
      </div>
      <TradeSummaryCard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PerformanceGraph symbol={symbol} />
        <DataStatistics symbol={symbol} />
      </div>
    </div>
  );
}
