import alpaca from '@/lib/alpaca';
import connectDB from '@/lib/mongodb';
import { Signal } from '@/models/Signal';
import { Trade } from '@/models/Trade';
import { NextRequest, NextResponse } from 'next/server';

const POSITION_SIZE = 1;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { signalId, symbol = 'SPY', signal } = body;

    if (!signal || !['BUY', 'SELL', 'HOLD'].includes(signal)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid signal (BUY, SELL, HOLD) is required',
        },
        { status: 400 }
      );
    }

    if (signal === 'HOLD') {
      return NextResponse.json({
        success: true,
        message: 'HOLD signal - No action taken',
      });
    }

    // Check current position
    let currentPosition = null;
    try {
      currentPosition = await alpaca.getPosition(symbol);
    } catch (error) {
      // No position exists
    }

    const currentQty = currentPosition ? parseInt(currentPosition.qty) : 0;

    let order = null;

    if (signal === 'BUY') {
      if (currentQty <= 0) {
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
      } else {
        return NextResponse.json({
          success: true,
          message: `Already holding ${currentQty} shares of ${symbol}`,
          currentPosition: {
            qty: currentQty,
            symbol,
          },
        });
      }
    } else if (signal === 'SELL') {
      if (currentQty > 0) {
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
      } else {
        return NextResponse.json({
          success: true,
          message: 'No position to sell or already short',
        });
      }
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
      if (signalId) {
        await Signal.findByIdAndUpdate(signalId, {
          executed: true,
          orderId: order.id,
        });
      }

      // Get updated account info
      const account = await alpaca.getAccount();

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          symbol: order.symbol,
          qty: order.qty,
          side: order.side,
          type: order.type,
          status: order.status,
        },
        account: {
          portfolioValue: parseFloat(account.portfolio_value),
          cash: parseFloat(account.cash),
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to place order',
    });
  } catch (error: any) {
    console.error('Error executing order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute order',
      },
      { status: 500 }
    );
  }
}
