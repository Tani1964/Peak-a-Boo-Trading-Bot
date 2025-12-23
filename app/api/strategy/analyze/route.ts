import { calculateIndicators, DEFAULT_CONFIG, generateSignal } from '@/lib/indicators';
import connectDB from '@/lib/mongodb';
import { fetchHistoricalData } from '@/lib/yahoo-finance';
import { Signal } from '@/models/Signal';
import alpaca from '@/lib/alpaca';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { symbol = 'SPY' } = body;

    // Check if market is open
    const clock = await alpaca.getClock();
    if (!clock.is_open) {
      return NextResponse.json({
        success: false,
        error: 'Market is currently closed',
        nextOpen: clock.next_open,
      });
    }

    // Fetch historical data (last 6 months for sufficient indicator calculation)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const historicalData = await fetchHistoricalData(symbol, startDate, endDate);

    if (historicalData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No market data available',
        },
        { status: 400 }
      );
    }

    // Calculate technical indicators
    const closePrices = historicalData.map((d) => d.close);
    const indicators = calculateIndicators(closePrices, DEFAULT_CONFIG);

    if (!indicators) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient data to calculate indicators',
        },
        { status: 400 }
      );
    }

    // Generate trading signal
    const signal = generateSignal(indicators);
    const latestPrice = closePrices[closePrices.length - 1];

    // Save signal to database
    const signalDoc = new Signal({
      timestamp: new Date(),
      symbol,
      signal,
      closePrice: latestPrice,
      rsi: indicators.rsi,
      macd: indicators.macd,
      macdSignal: indicators.macdSignal,
      executed: false,
    });

    await signalDoc.save();

    return NextResponse.json({
      success: true,
      signal: {
        id: signalDoc._id,
        timestamp: signalDoc.timestamp,
        symbol,
        signal,
        closePrice: latestPrice,
        indicators: {
          rsi: indicators.rsi,
          macd: indicators.macd,
          macdSignal: indicators.macdSignal,
          macdHistogram: indicators.macdHistogram,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Error analyzing strategy:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze strategy';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const symbol = searchParams.get('symbol');

    const query = symbol ? { symbol } : {};
    const signals = await Signal.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      signals,
    });
  } catch (error: unknown) {
    console.error('Error fetching signals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch signals';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
