"use client";

import CurrentStrategyCard from '@/components/CurrentStrategyCard';
import SignalHistory from '@/components/SignalHistory';
import StrategyCard from '@/components/StrategyCard';
import StrategyControl from '@/components/StrategyControl';
import SymbolSelector from '@/components/SymbolSelector';
import YouTubeStrategyExtractor from '@/components/YouTubeStrategyExtractor';
import { strategyApproach, strategyPlan, strategyReason } from '@/lib/strategy-text';
import { useState } from 'react';



export default function StrategiesPage() {
  const [symbol, setSymbol] = useState('AAPL');
  return (
    <div className="space-y-8">
      <SymbolSelector value={symbol} onChange={setSymbol} />
      <StrategyCard plan={strategyPlan} approach={strategyApproach} reason={strategyReason} />
      <CurrentStrategyCard />
      <StrategyControl symbol={symbol} onRefresh={() => {}} />
      <YouTubeStrategyExtractor />
      <SignalHistory symbol={symbol} refreshKey={0} />
    </div>
  );
}
