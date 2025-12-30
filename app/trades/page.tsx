"use client";

import { useState } from 'react';
import TradeHistory from '@/components/TradeHistory';
import TradeSummaryCard from '@/components/TradeSummaryCard';
import UpdatePendingTradesButton from '@/components/UpdatePendingTradesButton';
import SymbolSelector from '@/components/SymbolSelector';



export default function TradesPage() {
  const [symbol, setSymbol] = useState('AAPL');
  return (
    <div className="space-y-8">
      <SymbolSelector value={symbol} onChange={setSymbol} />
      <div className="flex justify-end">
        <UpdatePendingTradesButton />
      </div>
      <TradeSummaryCard />
      <TradeHistory symbol={symbol} refreshKey={0} />
    </div>
  );
}
