import { calculateIndicators, DEFAULT_CONFIG, generateSignal } from '@/lib/indicators';
import connectDB from '@/lib/mongodb';
import { fetchHistoricalData } from '@/lib/yahoo-finance';
import { Signal } from '@/models/Signal';
import { Trade } from '@/models/Trade';
import alpaca from '@/lib/alpaca';
import { NextRequest, NextResponse } from 'next/server';

const POSITION_SIZE = 1;

/**
 * Automated trading endpoint that analyzes and executes trades
 * Designed to be called by scheduled services (GitHub Actions, cron jobs, etc.)
 * 
 * Requires API_SECRET token in header for security
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Check for API secret token for security
    const apiSecret = request.headers.get('x-api-secret');
    const expectedSecret = process.env.AUTO_TRADE_SECRET;
    
    if (expectedSecret && apiSecret !== expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { symbol = 'SPY', autoExecute = true } = body;

    // Check if market is open
    const clock = await alpaca.getClock();
    if (!clock.is_open) {
      return NextResponse.json({
        success: false,
        error: 'Market is currently closed',
        nextOpen: clock.next_open,
        skipped: true,
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

    const result: any = {
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
      executed: false,
    };

    // Auto-execute if enabled and signal is not HOLD
    if (autoExecute && signal !== 'HOLD') {
      try {
        // Check current position
        let currentPosition = null;
        try {
          currentPosition = await alpaca.getPosition(symbol);
        } catch (error) {
          // No position exists
        }

        const currentQty = currentPosition ? parseInt(currentPosition.qty) : 0;
        let order = null;

        if (signal === 'BUY' && currentQty <= 0) {
          // Close any short position first
          if (currentQty < 0) {
            await alpaca.closePosition(symbol);
          }

          // Place buy order
          order = await alpaca.createOrder({
            symbol,
            qty: POSITION_SIZE,
            side: 'buy',
            type: 'market',
            time_in_force: 'day',
          });

          console.log(`✅ BUY order placed: ${POSITION_SIZE} shares of ${symbol}`);
        } else if (signal === 'SELL' && currentQty > 0) {
          // Close long position
          await alpaca.closePosition(symbol);

          // Place sell (short) order
          order = await alpaca.createOrder({
            symbol,
            qty: POSITION_SIZE,
            side: 'sell',
            type: 'market',
            time_in_force: 'day',
          });

          console.log(`✅ SELL order placed: ${POSITION_SIZE} shares of ${symbol}`);
        }

        if (order) {
          // Save trade to database
          const trade = new Trade({
            timestamp: new Date(),
            symbol,
            orderId: order.id,
            side: signal.toLowerCase(),
            quantity: POSITION_SIZE,
            price: parseFloat(order.filled_avg_price || '0'),
            status: order.status,
          });

          await trade.save();

          // Update signal as executed
          await Signal.findByIdAndUpdate(signalDoc._id, {
            executed: true,
            orderId: order.id,
          });

          result.executed = true;
          result.order = {
            id: order.id,
            symbol: order.symbol,
            qty: order.qty,
            side: order.side,
            type: order.type,
            status: order.status,
          };
        } else {
          result.message = signal === 'BUY' 
            ? `Already holding ${currentQty} shares, no action taken`
            : 'No position to sell, no action taken';
        }
      } catch (executeError: any) {
        result.executeError = executeError.message;
        console.error('Error executing order:', executeError);
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in auto trading:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute auto trading',
      },
      { status: 500 }
    );
  }
}

