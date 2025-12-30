import { calculateIndicators, DEFAULT_CONFIG } from '@/lib/indicators';
import connectDB from '@/lib/mongodb';
import { fetchCurrentPrice, fetchHistoricalData } from '@/lib/yahoo-finance';
import { Signal } from '@/models/Signal';
import { Trade } from '@/models/Trade';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  await connectDB();

  // Get the most recent filled trade
  const latestTrade = await Trade.findOne({ status: 'filled' }).sort({ timestamp: -1 }).lean();
  if (!latestTrade) {
    return NextResponse.json({ error: 'No trades found' }, { status: 404 });
  }

  // Get the most recent signal for this symbol
  const latestSignal = await Signal.findOne({ symbol: latestTrade.symbol }).sort({ timestamp: -1 }).lean();

  // Fetch current price and indicators
  let price = latestTrade.price;
  let indicators = null;
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const historicalData = await fetchHistoricalData(latestTrade.symbol, startDate, endDate);
    const closePrices = historicalData.map((d) => d.close);
    indicators = calculateIndicators(closePrices, DEFAULT_CONFIG);
    price = closePrices[closePrices.length - 1];
  } catch (e) {
    // fallback to trade price
  }

  // Compose explanation and holding period
  const explanation = latestSignal
    ? `Signal: ${latestSignal.signal}. RSI: ${latestSignal.rsi.toFixed(2)}, MACD: ${latestSignal.macd.toFixed(2)}. Trade executed based on these indicators.`
    : 'No signal data available.';
  const holdingPeriod = 'Dynamic, based on indicator thresholds and strategy rules.';
  const buyReason = latestSignal
    ? `Triggered by: RSI=${latestSignal.rsi.toFixed(2)}, MACD=${latestSignal.macd.toFixed(2)}, MACD Histogram=${latestSignal.macdHistogram.toFixed(2)}.`
    : 'No signal data available.';

  // Optionally, you could fetch news here if you have a news API
  const news = [];

  return NextResponse.json({
    symbol: latestTrade.symbol,
    action: latestTrade.side.toUpperCase(),
    price,
    time: latestTrade.timestamp,
    explanation,
    holdingPeriod,
    buyReason,
    indicators,
    news,
  });
}
