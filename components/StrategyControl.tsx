'use client';

import { useState } from 'react';

interface StrategyControlProps {
  symbol: string;
  onRefresh: () => void;
}

interface SignalResult {
  id: string;
  timestamp: string | Date;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  closePrice: number;
  indicators: {
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
  };
}

export default function StrategyControl({ symbol, onRefresh }: StrategyControlProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SignalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeStrategy = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/strategy/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to analyze strategy');
        return;
      }

      setResult(data.signal);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const executeStrategy = async () => {
    if (!result) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/strategy/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signalId: result.id,
          symbol,
          signal: result.signal,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to execute order');
        return;
      }

      alert(`✅ Order executed successfully: ${result.signal} ${symbol}`);
      setResult(null);
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        🎯 <span>Strategy Control</span>
      </h2>

      <div className="space-y-6">
        <div className="flex gap-4">
          <button
            onClick={analyzeStrategy}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? '⏳ Analyzing...' : '🔍 Analyze Strategy'}
          </button>

          {result && (
            <button
              onClick={executeStrategy}
              disabled={loading || result.signal === 'HOLD'}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-base font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? '⏳ Executing...' : `⚡ Execute ${result.signal}`}
            </button>
          )}
        </div>

        {error && (
          <div className="p-5 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-xl">
            <p className="text-red-800 font-bold text-base">❌ {error}</p>
          </div>
        )}

        {result && (
          <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 rounded-xl">
            <h3 className="font-bold mb-4 text-lg text-gray-900 flex items-center gap-2">
              📊 <span>Analysis Result</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-blue-200">
                <span className="text-gray-700 font-medium text-base">Signal</span>
                <span
                  className={`font-black text-xl px-4 py-1 rounded-lg ${
                    result.signal === 'BUY'
                      ? 'bg-green-500 text-white'
                      : result.signal === 'SELL'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}
                >
                  {result.signal}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 font-medium text-base">Close Price</span>
                <span className="font-bold text-lg text-gray-900">${result.closePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-white/50 -mx-2 px-2 rounded-lg">
                <span className="text-gray-600 font-medium text-base">RSI</span>
                <span className="font-bold text-base text-gray-900">{result.indicators.rsi.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 font-medium text-base">MACD</span>
                <span className="font-bold text-base text-gray-900">{result.indicators.macd.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-white/50 -mx-2 px-2 rounded-lg">
                <span className="text-gray-600 font-medium text-base">MACD Signal</span>
                <span className="font-bold text-base text-gray-900">
                  {result.indicators.macdSignal.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
