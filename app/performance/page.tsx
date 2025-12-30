"use client";
import DataStatistics from '@/components/DataStatistics';
import PerformanceGraph from '@/components/PerformanceGraph';
import SymbolSelector from '@/components/SymbolSelector';
import { useState } from 'react';



export default function PerformancePage() {
  const [symbol, setSymbol] = useState('AAPL');
  return (
    <div className="space-y-8">
      <SymbolSelector value={symbol} onChange={setSymbol} />
      <PerformanceGraph symbol={symbol} />
      <DataStatistics symbol={symbol} />
    </div>
  );
}
