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
    <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              📊 Peak-a-Boo Trading Bot
            </h1>
            <p className="text-base text-gray-600 mt-2 font-medium">
              Automated trading with RSI & MACD strategies
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <label htmlFor="symbol" className="text-sm font-semibold text-gray-700">
              Symbol:
            </label>
            <input
              id="symbol"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-semibold text-gray-900 transition-all"
              placeholder="SPY"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Update
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
