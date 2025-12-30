"use client";
import DataStatistics from '@/components/DataStatistics';
import PerformanceGraph from '@/components/PerformanceGraph';
import SymbolSelector from '@/components/SymbolSelector';
import { useState } from 'react';



export default function PerformancePage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [refreshKey, setRefreshKey] = useState(0);

  // Update refreshKey when symbol changes
  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-8">
      <SymbolSelector value={symbol} onChange={handleSymbolChange} />
      <PerformanceGraph symbol={symbol} refreshKey={refreshKey} />
      <DataStatistics symbol={symbol} refreshKey={refreshKey} />
    </div>
  );
}

export const dynamic = 'force-dynamic';

