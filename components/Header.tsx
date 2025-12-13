'use client';

import { useState } from 'react';

interface HeaderProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
}

export default function Header({ symbol, onSymbolChange }: HeaderProps) {
  const [inputValue, setInputValue] = useState(symbol);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSymbolChange(inputValue.trim().toUpperCase());
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              📊 Peak-a-Boo Trading Bot
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Automated trading with RSI & MACD strategies
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <label htmlFor="symbol" className="text-sm font-medium text-gray-700">
              Symbol:
            </label>
            <input
              id="symbol"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
              placeholder="SPY"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Change
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
