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

  // AGGRESSIVE STRATEGY: More frequent signals to achieve 3x growth in 30 days
  // Buy signals: Multiple conditions for more opportunities
  // 1. RSI oversold (wider band: < 40 instead of < 30)
  // 2. RSI neutral but MACD bullish (40-60 range)
  // 3. Strong MACD bullish momentum
  if (rsi < 40 && macd > macdSignal) {
    return 'BUY';
  }
  
  // Buy on MACD bullish crossover even with moderate RSI
  if (rsi < 55 && macd > macdSignal && macdHistogram > 0) {
    return 'BUY';
  }

  // Sell signals: More aggressive exit conditions
  // 1. RSI overbought (wider band: > 60 instead of > 70)
  // 2. RSI neutral but MACD bearish (40-60 range)
  // 3. Strong MACD bearish momentum
  if (rsi > 60 && macd < macdSignal) {
    return 'SELL';
  }
  
  // Sell on MACD bearish crossover even with moderate RSI
  if (rsi > 45 && macd < macdSignal && macdHistogram < 0) {
    return 'SELL';
  }

  return 'HOLD';
}
