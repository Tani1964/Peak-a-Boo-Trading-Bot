import { MACD, RSI } from 'technicalindicators';

export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
}

export interface IndicatorConfig {
  rsiPeriod: number;
  macdFast: number;
  macdSlow: number;
  macdSignalPeriod: number;
}

export const DEFAULT_CONFIG: IndicatorConfig = {
  rsiPeriod: 14,
  macdFast: 12,
  macdSlow: 26,
  macdSignalPeriod: 9,
};

export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsiValues = RSI.calculate({
    values: prices,
    period,
  });
  return rsiValues;
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
) {
  const macdValues = MACD.calculate({
    values: prices,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  return macdValues;
}

export function calculateIndicators(
  closePrices: number[],
  config: IndicatorConfig = DEFAULT_CONFIG
): TechnicalIndicators | null {
  if (closePrices.length < Math.max(config.macdSlow + config.macdSignalPeriod, config.rsiPeriod)) {
    return null;
  }

  const rsiValues = calculateRSI(closePrices, config.rsiPeriod);
  const macdValues = calculateMACD(
    closePrices,
    config.macdFast,
    config.macdSlow,
    config.macdSignalPeriod
  );

  if (rsiValues.length === 0 || macdValues.length === 0) {
    return null;
  }

  const latestRSI = rsiValues[rsiValues.length - 1];
  const latestMACD = macdValues[macdValues.length - 1];

  return {
    rsi: latestRSI,
    macd: latestMACD.MACD || 0,
    macdSignal: latestMACD.signal || 0,
    macdHistogram: latestMACD.histogram || 0,
  };
}

export type Signal = 'BUY' | 'SELL' | 'HOLD';

export function generateSignal(indicators: TechnicalIndicators): Signal {
  const { rsi, macd, macdSignal, macdHistogram } = indicators;

  // VERY AGGRESSIVE STRATEGY: Maximum trade frequency to achieve 3x growth in 30 days
  // Goal: Generate as many profitable trades as possible
  
  // Buy signals: VERY WIDE bands for maximum opportunities
  // 1. RSI oversold/neutral (very wide band: < 50 instead of < 30)
  // 2. Any MACD bullish signal
  // 3. Even slight bullish momentum
  
  // Primary BUY: RSI below 50 with any bullish MACD indication
  if (rsi < 50 && macd > macdSignal) {
    return 'BUY';
  }
  
  // BUY on any MACD bullish crossover (even with RSI up to 60)
  if (rsi < 60 && macd > macdSignal && macdHistogram > 0) {
    return 'BUY';
  }
  
  // BUY on strong MACD histogram momentum (aggressive entry)
  if (macdHistogram > 0 && macd > macdSignal && rsi < 65) {
    return 'BUY';
  }

  // Sell signals: VERY WIDE bands for maximum opportunities
  // 1. RSI overbought/neutral (very wide band: > 50 instead of > 70)
  // 2. Any MACD bearish signal
  // 3. Even slight bearish momentum
  
  // Primary SELL: RSI above 50 with any bearish MACD indication
  if (rsi > 50 && macd < macdSignal) {
    return 'SELL';
  }
  
  // SELL on any MACD bearish crossover (even with RSI down to 40)
  if (rsi > 40 && macd < macdSignal && macdHistogram < 0) {
    return 'SELL';
  }
  
  // SELL on strong MACD histogram negative momentum (aggressive exit)
  if (macdHistogram < 0 && macd < macdSignal && rsi > 35) {
    return 'SELL';
  }

  // Minimize HOLD - only when truly neutral (very narrow range)
  // This ensures we're almost always in a trade
  return 'HOLD';
}
