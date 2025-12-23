import alpaca, { AlpacaAccount, AlpacaPosition, AlpacaOrder } from '@/lib/alpaca';
import connectDB from '@/lib/mongodb';
import { Signal } from '@/models/Signal';
import { Trade } from '@/models/Trade';
import { AccountSnapshot } from '@/models/AccountSnapshot';
import { fetchCurrentPrice } from '@/lib/yahoo-finance';
import { NextRequest, NextResponse } from 'next/server';

// Goal: Triple account in 30 days (3x growth)
const GROWTH_TARGET = 3.0; // 3x = 300% return
const TARGET_DAYS = 30;
const _DAILY_TARGET_RETURN = Math.pow(GROWTH_TARGET, 1 / TARGET_DAYS) - 1; // ~3.7% daily (unused but kept for reference)
const POSITION_SIZE_PERCENT = 0.5; // Use 50% of buying power per trade (aggressive)
const MIN_POSITION_SIZE = 1; // Minimum 1 share

/**
 * Calculate position size based on account value and growth goals
 * Goal: Triple account in 30 days requires aggressive position sizing
 */
async function calculatePositionSize(symbol: string, accountValue: number, buyingPower: number): Promise<number> {
  try {
    // Get current price
    const currentPrice = await fetchCurrentPrice(symbol);
    
    if (!currentPrice || currentPrice <= 0) {
      // Fallback: use a reasonable default price estimate (SPY is typically $400-600)
      return Math.max(MIN_POSITION_SIZE, Math.floor((buyingPower * POSITION_SIZE_PERCENT) / 500));
    }

    // Calculate position size: use percentage of buying power
    // For aggressive growth, we use a larger portion of buying power
    const positionValue = buyingPower * POSITION_SIZE_PERCENT;
    const shares = Math.floor(positionValue / currentPrice);

    return Math.max(MIN_POSITION_SIZE, shares);
  } catch (error) {
    console.error('Error calculating position size:', error);
    // Fallback to conservative estimate
    return Math.max(MIN_POSITION_SIZE, Math.floor((buyingPower * POSITION_SIZE_PERCENT) / 500));
  }
}

/**
 * Get initial account value (first snapshot) or current value
 */
async function getInitialAccountValue(): Promise<number | null> {
  try {
    const firstSnapshot = await AccountSnapshot.findOne().sort({ timestamp: 1 });
    return firstSnapshot ? firstSnapshot.portfolioValue : null;
  } catch (error) {
    console.error('Error getting initial account value:', error);
    return null;
  }
}

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

    // Get account info for position sizing
    const account = await alpaca.getAccount() as AlpacaAccount;
    const accountValue = parseFloat(account.portfolio_value);
    const buyingPower = parseFloat(account.buying_power);
    const initialValue = await getInitialAccountValue();
    
    // Calculate growth metrics
    const currentGrowth = initialValue ? (accountValue / initialValue) : 1.0;
    const daysElapsed = initialValue ? Math.max(1, Math.floor((Date.now() - (await AccountSnapshot.findOne().sort({ timestamp: 1 }))!.timestamp.getTime()) / (1000 * 60 * 60 * 24))) : 1;
    const requiredGrowth = Math.pow(GROWTH_TARGET, daysElapsed / TARGET_DAYS);
    const progressToGoal = initialValue ? (currentGrowth / requiredGrowth) * 100 : 0;

    console.log(`📊 Growth Tracking: Current: ${(currentGrowth * 100).toFixed(2)}% | Target: ${(requiredGrowth * 100).toFixed(2)}% | Progress: ${progressToGoal.toFixed(2)}%`);

    if (signal === 'HOLD') {
      return NextResponse.json({
        success: true,
        message: 'HOLD signal - No action taken',
        growth: {
          current: currentGrowth,
          target: requiredGrowth,
          progress: progressToGoal,
        },
      });
    }

    // Check current position
    let currentPosition: AlpacaPosition | null = null;
    try {
      currentPosition = await alpaca.getPosition(symbol) as AlpacaPosition;
    } catch {
      // No position exists
    }

    const currentQty = currentPosition ? parseInt(currentPosition.qty) : 0;

    // Calculate dynamic position size
    const positionSize = await calculatePositionSize(symbol, accountValue, buyingPower);

    let order = null;

    if (signal === 'BUY') {
      if (currentQty <= 0) {
        // Close any short position first
        if (currentQty < 0) {
          await alpaca.closePosition(symbol);
        }

        // Place buy order with calculated position size
        order = await alpaca.createOrder({
          symbol,
          qty: positionSize,
          side: 'buy',
          type: 'market',
          time_in_force: 'day',
        });

        const positionValue = positionSize * (await fetchCurrentPrice(symbol).catch(() => 500));
        console.log(`✅ BUY order placed: ${positionSize} shares of ${symbol} (~$${positionValue.toFixed(2)}, ${(POSITION_SIZE_PERCENT * 100).toFixed(0)}% of buying power)`);
      } else {
        // Consider adding to position if we're behind on growth target
        if (progressToGoal < 90 && buyingPower > accountValue * 0.1) {
          const additionalSize = await calculatePositionSize(symbol, accountValue, buyingPower);
          if (additionalSize > 0) {
            order = await alpaca.createOrder({
              symbol,
              qty: additionalSize,
              side: 'buy',
              type: 'market',
              time_in_force: 'day',
            });
            console.log(`📈 Adding to position: ${additionalSize} shares (behind growth target)`);
          }
        } else {
          return NextResponse.json({
            success: true,
            message: `Already holding ${currentQty} shares of ${symbol}`,
            currentPosition: {
              qty: currentQty,
              symbol,
            },
            growth: {
              current: currentGrowth,
              target: requiredGrowth,
              progress: progressToGoal,
            },
          });
        }
      }
    } else if (signal === 'SELL') {
      if (currentQty > 0) {
        // Close long position
        await alpaca.closePosition(symbol);

        // Place sell (short) order with calculated position size
        order = await alpaca.createOrder({
          symbol,
          qty: positionSize,
          side: 'sell',
          type: 'market',
          time_in_force: 'day',
        });

        const positionValue = positionSize * (await fetchCurrentPrice(symbol).catch(() => 500));
        console.log(`✅ SELL order placed: ${positionSize} shares of ${symbol} (~$${positionValue.toFixed(2)}, ${(POSITION_SIZE_PERCENT * 100).toFixed(0)}% of buying power)`);
      } else {
        return NextResponse.json({
          success: true,
          message: 'No position to sell or already short',
          growth: {
            current: currentGrowth,
            target: requiredGrowth,
            progress: progressToGoal,
          },
        });
      }
    }

    if (order) {
      const orderData = order as AlpacaOrder;
      // Save trade to database
      const trade = new Trade({
        timestamp: new Date(),
        symbol,
        orderId: orderData.id,
        side: signal.toLowerCase() as 'buy' | 'sell',
        quantity: positionSize,
        price: parseFloat(orderData.filled_avg_price || '0'),
        status: orderData.status as 'pending' | 'filled' | 'cancelled' | 'rejected',
      });

      await trade.save();

      // Update signal as executed
      if (signalId) {
        await Signal.findByIdAndUpdate(signalId, {
          executed: true,
          orderId: orderData.id,
        });
      }

      // Get updated account info
      const updatedAccount = await alpaca.getAccount() as AlpacaAccount;
      const updatedValue = parseFloat(updatedAccount.portfolio_value);
      const updatedGrowth = initialValue ? (updatedValue / initialValue) : 1.0;

      return NextResponse.json({
        success: true,
        order: {
          id: orderData.id,
          symbol: orderData.symbol,
          qty: orderData.qty,
          side: orderData.side,
          type: orderData.type,
          status: orderData.status,
        },
        account: {
          portfolioValue: updatedValue,
          cash: parseFloat(updatedAccount.cash),
          buyingPower: parseFloat(updatedAccount.buying_power),
        },
        growth: {
          current: updatedGrowth,
          target: requiredGrowth,
          progress: initialValue ? ((updatedGrowth / requiredGrowth) * 100) : 0,
          goal: `${(GROWTH_TARGET * 100).toFixed(0)}x in ${TARGET_DAYS} days`,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to place order',
    });
  } catch (error: unknown) {
    console.error('Error executing order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute order';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
