'use client';

import Dashboard from '@/components/Dashboard';
import Header from '@/components/Header';
import { TimezoneProvider } from '@/lib/timezone';
import { useState } from 'react';

export default function Home() {
  const [symbol, setSymbol] = useState('SPY');

  return (
    <TimezoneProvider>
      <main className="min-h-screen bg-gray-50">
        <Header symbol={symbol} onSymbolChange={setSymbol} />
        <Dashboard symbol={symbol} />
      </main>
    </TimezoneProvider>
  );
}
