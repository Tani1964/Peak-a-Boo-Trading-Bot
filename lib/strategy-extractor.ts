/**
 * Utility to extract trading strategies from video transcripts
 * Uses pattern matching and can be enhanced with AI/LLM services
 */

export interface ExtractedStrategy {
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

/**
 * Extract trading strategies from transcript text
 * This is a basic implementation that can be enhanced with AI services
 */
export function extractStrategiesFromTranscript(transcript: string): ExtractedStrategy[] {
  const strategies: ExtractedStrategy[] = [];

  // Common trading indicators to look for
  const indicatorPatterns = {
    rsi: /rsi|relative strength index/gi,
    macd: /macd|moving average convergence divergence/gi,
    ema: /ema|exponential moving average/gi,
    sma: /sma|simple moving average/gi,
    bollinger: /bollinger|bollinger bands/gi,
    stochastic: /stochastic/gi,
    adx: /adx|average directional index/gi,
    volume: /volume/gi,
    support: /support/gi,
    resistance: /resistance/gi,
  };

  // Extract indicators mentioned
  const foundIndicators: string[] = [];
  for (const [indicator, pattern] of Object.entries(indicatorPatterns)) {
    if (pattern.test(transcript)) {
      foundIndicators.push(indicator.toUpperCase());
    }
  }

  // Look for entry/exit conditions
  const entryKeywords = ['buy', 'enter', 'long', 'entry', 'signal', 'oversold', 'breakout'];
  const exitKeywords = ['sell', 'exit', 'short', 'stop', 'take profit', 'overbought'];
  const riskKeywords = ['stop loss', 'risk', 'position size', 'risk management', 'stop'];

  const entryConditions: string[] = [];
  const exitConditions: string[] = [];
  const riskManagement: string[] = [];

  // Extract sentences containing entry/exit/risk keywords
  const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 10);

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    
    // Check for entry conditions
    if (entryKeywords.some((keyword) => lowerSentence.includes(keyword))) {
      entryConditions.push(sentence.trim());
    }

    // Check for exit conditions
    if (exitKeywords.some((keyword) => lowerSentence.includes(keyword))) {
      exitConditions.push(sentence.trim());
    }

    // Check for risk management
    if (riskKeywords.some((keyword) => lowerSentence.includes(keyword))) {
      riskManagement.push(sentence.trim());
    }
  }

  // Extract timeframes
  const timeframePattern = /\b(1m|5m|15m|30m|1h|4h|daily|d1|weekly|w1|monthly|m1|intraday|day trading|swing trading|scalping)\b/gi;
  const timeframes = [...new Set(transcript.match(timeframePattern) || [])].map((t) => t.trim());

  // Create strategy object if we found meaningful content
  if (foundIndicators.length > 0 || entryConditions.length > 0 || exitConditions.length > 0) {
    strategies.push({
      name: 'Extracted Trading Strategy',
      description: `Strategy extracted from video transcript. Found ${foundIndicators.length} indicators, ${entryConditions.length} entry conditions, and ${exitConditions.length} exit conditions.`,
      indicators: foundIndicators.map((ind) => ({
        type: ind,
      })),
      entryConditions: entryConditions.slice(0, 10), // Limit to first 10
      exitConditions: exitConditions.slice(0, 10),
      riskManagement: riskManagement.slice(0, 10),
      timeframes: timeframes.length > 0 ? timeframes : undefined,
    });
  }

  // If no strategies found, create a generic one with the full transcript
  if (strategies.length === 0) {
    strategies.push({
      name: 'Video Strategy',
      description: transcript.substring(0, 500) + (transcript.length > 500 ? '...' : ''),
    });
  }

  return strategies;
}

/**
 * Enhanced extraction using AI/LLM (optional - can be integrated with OpenAI, Anthropic, etc.)
 * This is a placeholder for future AI integration
 */
export async function extractStrategiesWithAI(
  transcript: string,
  _apiKey?: string
): Promise<ExtractedStrategy[]> {
  // TODO: Integrate with AI service (OpenAI, Anthropic, etc.)
  // For now, fall back to pattern matching
  return extractStrategiesFromTranscript(transcript);
}

