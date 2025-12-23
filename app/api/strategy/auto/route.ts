import { calculateIndicators, DEFAULT_CONFIG, generateSignal } from '@/lib/indicators';
import connectDB from '@/lib/mongodb';
import { fetchHistoricalData } from '@/lib/yahoo-finance';
import { Signal } from '@/models/Signal';
import { Trade } from '@/models/Trade';
import alpaca, { AlpacaPosition, AlpacaOrder } from '@/lib/alpaca';
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

    interface AutoTradeResult {
      success: boolean;
      signal: {
        id: string;
        timestamp: Date;
        symbol: string;
        signal: string;
        closePrice: number;
        indicators: {
          rsi: number;
          macd: number;
          macdSignal: number;
          macdHistogram: number;
        };
      };
      executed: boolean;
      order?: {
        id: string;
        symbol: string;
        qty: string;
        side: string;
        type: string;
        status: string;
      };
      message?: string;
      executeError?: string;
    }

    const result: AutoTradeResult = {
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
        let currentPosition: AlpacaPosition | null = null;
        try {
          currentPosition = await alpaca.getPosition(symbol) as AlpacaPosition;
        } catch {
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
          const orderData = order as AlpacaOrder;
          // Save trade to database
          const trade = new Trade({
            timestamp: new Date(),
            symbol,
            orderId: orderData.id,
            side: signal.toLowerCase() as 'buy' | 'sell',
            quantity: POSITION_SIZE,
            price: parseFloat(orderData.filled_avg_price || '0'),
            status: orderData.status as 'pending' | 'filled' | 'cancelled' | 'rejected',
          });

          await trade.save();

          // Update signal as executed
          await Signal.findByIdAndUpdate(signalDoc._id, {
            executed: true,
            orderId: orderData.id,
          });

          result.executed = true;
          result.order = {
            id: orderData.id,
            symbol: orderData.symbol,
            qty: orderData.qty,
            side: orderData.side,
            type: orderData.type,
            status: orderData.status,
          };
        } else {
          result.message = signal === 'BUY' 
            ? `Already holding ${currentQty} shares, no action taken`
            : 'No position to sell, no action taken';
        }
      } catch (executeError: unknown) {
        result.executeError = executeError instanceof Error ? executeError.message : 'Unknown error executing order';
        console.error('Error executing order:', executeError);
      }
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in auto trading:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute auto trading';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

