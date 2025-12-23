'use client';

import { useState } from 'react';

interface ExtractedStrategy {
  name: string;
  description: string;
  indicators?: {
    type: string;
    parameters?: Record<string, unknown>;
  }[];
  entryConditions?: string[];
  exitConditions?: string[];
  riskManagement?: string[];
  timeframes?: string[];
}

interface ExtractionResult {
  videoId: string;
  videoUrl: string;
  strategiesCount: number;
  strategies: ExtractedStrategy[];
  transcriptLength: number;
}

export default function YouTubeStrategyExtractor() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const extractStrategy = async () => {
    if (!videoUrl.trim()) {
      setError('Please enter a YouTube video URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCached(false);

    try {
      const response = await fetch('/api/youtube/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: videoUrl.trim() }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to extract strategy');
        return;
      }

      setResult(data.data);
      setCached(data.cached || false);
      setVideoUrl(''); // Clear input on success
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        🎥 <span>Extract Strategies from YouTube</span>
      </h2>

      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-2">
              YouTube Video URL
            </label>
            <div className="flex gap-2">
              <input
                id="youtube-url"
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    extractStrategy();
                  }
                }}
              />
              <button
                onClick={extractStrategy}
                disabled={loading || !videoUrl.trim()}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white text-base font-bold rounded-xl hover:from-red-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? '⏳ Extracting...' : '🚀 Extract'}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Paste a YouTube video URL to extract trading strategies from the video transcript
            </p>
          </div>
        </div>

        {error && (
          <div className="p-5 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-xl">
            <p className="text-red-800 font-bold text-base mb-2">❌ {error}</p>
            <div className="text-sm text-red-700 mt-3 space-y-1">
              <p className="font-semibold">Troubleshooting tips:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Make sure the video has captions/subtitles enabled (check the CC button on YouTube)</li>
                <li>Try a different video that you know has captions</li>
                <li>Some videos may take 24-48 hours after upload for auto-generated captions</li>
                <li>Age-restricted or private videos may not have accessible transcripts</li>
              </ul>
            </div>
          </div>
        )}

        {result && (
          <div className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 border-2 border-purple-300 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                📊 <span>Extracted Strategies</span>
              </h3>
              {cached && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                  Cached
                </span>
              )}
            </div>

            <div className="space-y-4 mb-4">
              <div className="flex justify-between items-center py-2 border-b border-purple-200">
                <span className="text-gray-700 font-medium text-base">Video ID</span>
                <span className="font-bold text-base text-gray-900">{result.videoId}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-purple-200">
                <span className="text-gray-700 font-medium text-base">Strategies Found</span>
                <span className="font-bold text-base text-gray-900">{result.strategiesCount}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700 font-medium text-base">Transcript Length</span>
                <span className="font-bold text-base text-gray-900">
                  {result.transcriptLength.toLocaleString()} characters
                </span>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              {result.strategies.map((strategy, index) => (
                <div
                  key={index}
                  className="p-4 bg-white/60 rounded-xl border border-purple-200"
                >
                  <h4 className="font-bold text-base text-gray-900 mb-2">{strategy.name}</h4>
                  <p className="text-sm text-gray-700 mb-3">{strategy.description}</p>

                  {strategy.indicators && strategy.indicators.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-bold text-gray-600">Indicators: </span>
                      <span className="text-xs text-gray-700">
                        {strategy.indicators.map((ind) => ind.type).join(', ')}
                      </span>
                    </div>
                  )}

                  {strategy.entryConditions && strategy.entryConditions.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-bold text-green-700">Entry Conditions:</span>
                      <ul className="list-disc list-inside text-xs text-gray-700 mt-1">
                        {strategy.entryConditions.slice(0, 3).map((condition, i) => (
                          <li key={i} className="truncate">
                            {condition.substring(0, 100)}
                            {condition.length > 100 ? '...' : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {strategy.exitConditions && strategy.exitConditions.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-bold text-red-700">Exit Conditions:</span>
                      <ul className="list-disc list-inside text-xs text-gray-700 mt-1">
                        {strategy.exitConditions.slice(0, 3).map((condition, i) => (
                          <li key={i} className="truncate">
                            {condition.substring(0, 100)}
                            {condition.length > 100 ? '...' : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {strategy.timeframes && strategy.timeframes.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-blue-700">Timeframes: </span>
                      <span className="text-xs text-gray-700">{strategy.timeframes.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-purple-200">
              <a
                href={result.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:text-purple-800 font-medium underline"
              >
                🔗 Open Video on YouTube
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

