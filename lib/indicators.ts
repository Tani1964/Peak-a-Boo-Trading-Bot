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
  const { rsi, macd, macdSignal } = indicators;

  // Buy signal: RSI oversold + MACD bullish crossover
  if (rsi < 30 && macd > macdSignal) {
    return 'BUY';
  }

  // Sell signal: RSI overbought + MACD bearish crossover
  if (rsi > 70 && macd < macdSignal) {
    return 'SELL';
  }

  return 'HOLD';
}
