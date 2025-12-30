"use client";
import dynamic from 'next/dynamic';

const PerformanceGraph = dynamic(
  () => import('@/components/PerformanceGraph'),
  { ssr: false }
);

const DataStatistics = dynamic(
  () => import('@/components/DataStatistics'),
  { ssr: false }
);

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


