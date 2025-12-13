'use client';

import { useState } from 'react';

interface StrategyControlProps {
  symbol: string;
  onRefresh: () => void;
}

export default function StrategyControl({ symbol, onRefresh }: StrategyControlProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
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
    } catch (err: any) {
      setError(err.message || 'An error occurred');
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
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">🎯 Strategy Control</h2>

      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={analyzeStrategy}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Analyzing...' : '🔍 Analyze Strategy'}
          </button>

          {result && (
            <button
              onClick={executeStrategy}
              disabled={loading || result.signal === 'HOLD'}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Executing...' : `⚡ Execute ${result.signal}`}
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">❌ Error: {error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold mb-2">📊 Analysis Result</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Signal:</span>
                <span
                  className={`font-bold ${
                    result.signal === 'BUY'
                      ? 'text-green-600'
                      : result.signal === 'SELL'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {result.signal}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Close Price:</span>
                <span className="font-semibold">${result.closePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">RSI:</span>
                <span className="font-semibold">{result.indicators.rsi.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">MACD:</span>
                <span className="font-semibold">{result.indicators.macd.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">MACD Signal:</span>
                <span className="font-semibold">
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
