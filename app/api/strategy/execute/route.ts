import alpaca, { AlpacaAccount, AlpacaOrder, AlpacaPosition } from '@/lib/alpaca';
import connectDB from '@/lib/mongodb';
import { fetchCurrentPrice } from '@/lib/yahoo-finance';
import { AccountSnapshot } from '@/models/AccountSnapshot';
import { Signal } from '@/models/Signal';
import { Trade } from '@/models/Trade';
import { NextRequest, NextResponse } from 'next/server';

// Goal: Triple account in 30 days (3x growth)
const GROWTH_TARGET = 3.0; // 3x = 300% return
const TARGET_DAYS = 30;
const _DAILY_TARGET_RETURN = Math.pow(GROWTH_TARGET, 1 / TARGET_DAYS) - 1; // ~3.7% daily (unused but kept for reference)
const BASE_POSITION_SIZE_PERCENT = 0.85; // Use 85% of buying power per trade (VERY AGGRESSIVE for 3x goal)
const MAX_POSITION_SIZE_PERCENT = 0.95; // Maximum 95% when way behind on goals
const MIN_POSITION_SIZE = 1; // Minimum 1 share

/**
 * Map Alpaca order status to Trade model status enum
 * Alpaca statuses: new, pending_new, accepted, pending_cancel, pending_replace, 
 *                  filled, partially_filled, canceled, expired, replaced, rejected
 * Trade statuses: pending, filled, cancelled, rejected, blocked
 */
function mapAlpacaStatusToTradeStatus(alpacaStatus: string): 'pending' | 'filled' | 'cancelled' | 'rejected' | 'blocked' {
  const status = alpacaStatus.toLowerCase();
  
  // Filled statuses
  if (status === 'filled' || status === 'partially_filled') {
    return 'filled';
  }
  
  // Cancelled statuses
  if (status === 'canceled' || status === 'cancelled' || status === 'expired' || status === 'replaced') {
    return 'cancelled';
  }
  
  // Rejected status
  if (status === 'rejected' || status === 'failed') {
    return 'rejected';
  }
  
  // All pending/new/accepted statuses map to pending
  if (status === 'new' || status === 'pending_new' || status === 'accepted' || 
      status === 'pending_cancel' || status === 'pending_replace' || status === 'pending') {
    return 'pending';
  }
  
  // Default to pending for unknown statuses
  return 'pending';
}

/**
 * Calculate position size based on account value and growth goals
 * Goal: Triple account in 30 days requires VERY aggressive position sizing
 * Dynamically adjusts based on progress toward goal
 * MAXIMIZES use of available cash and buying power
 */
async function calculatePositionSize(
  symbol: string, 
  accountValue: number, 
  buyingPower: number,
  cash: number,
  progressToGoal: number = 100
): Promise<number> {
  try {
    // Get current price
    const currentPrice = await fetchCurrentPrice(symbol);
    
    // Dynamic position sizing: use more when behind on goals
    let positionSizePercent = BASE_POSITION_SIZE_PERCENT;
    if (progressToGoal < 80) {
      // Behind on goal - use even more aggressive sizing
      positionSizePercent = MAX_POSITION_SIZE_PERCENT;
    } else if (progressToGoal < 95) {
      // Slightly behind - use base aggressive sizing
      positionSizePercent = BASE_POSITION_SIZE_PERCENT;
    }
    
    if (!currentPrice || currentPrice <= 0) {
      // Fallback: use a reasonable default price estimate (SPY is typically $400-600)
      const maxAvailable = Math.max(buyingPower, cash);
      return Math.max(MIN_POSITION_SIZE, Math.floor((maxAvailable * positionSizePercent) / 500));
    }

    // MAXIMIZE position size: Use the maximum of cash and buying power
    // This ensures we use all available resources, not just buying power
    const maxAvailable = Math.max(buyingPower, cash);
    
    // Calculate position size: use percentage of maximum available
    // For aggressive growth, we use a larger portion of available funds
    const positionValue = maxAvailable * positionSizePercent;
    const shares = Math.floor(positionValue / currentPrice);

    console.log(`💰 Position Sizing: Cash=$${cash.toFixed(2)}, BuyingPower=$${buyingPower.toFixed(2)}, MaxAvailable=$${maxAvailable.toFixed(2)}, PositionValue=$${positionValue.toFixed(2)}, Shares=${shares}, Price=$${currentPrice.toFixed(2)}`);

    return Math.max(MIN_POSITION_SIZE, shares);
  } catch (error) {
    console.error('Error calculating position size:', error);
    // Fallback to aggressive estimate using max of cash/buying power
    const maxAvailable = Math.max(buyingPower, cash);
    return Math.max(MIN_POSITION_SIZE, Math.floor((maxAvailable * BASE_POSITION_SIZE_PERCENT) / 500));
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
  // Store body for error handling
  let requestBody: { signalId?: string; symbol?: string; signal?: string } = {};
  
  try {
    await connectDB();

    const body = await request.json();
    requestBody = body; // Store for error handling
    const { signalId, symbol = 'SPY', signal } = body;
    const normalizedSymbol = symbol.toUpperCase().trim();

    if (!signal || !['BUY', 'SELL', 'HOLD'].includes(signal)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid signal (BUY, SELL, HOLD) is required',
        },
        { status: 400 }
      );
    }

    // Get account info for position sizing (needed even for rejected trades)
    const account = await alpaca.getAccount() as AlpacaAccount;
    const accountValue = parseFloat(account.portfolio_value);
    const buyingPower = parseFloat(account.buying_power);
    const cash = parseFloat(account.cash);
    const initialValue = await getInitialAccountValue();
    
    // Check if market is open (9:30 AM - 4:00 PM ET)
    // TEST MODES:
    // - TEST_MARKET_CLOSED=true: Simulate closed market (blocks trades)
    // - TEST_BYPASS_MARKET_HOURS=true: Bypass market hours check (allows trades even when closed)
    const testMarketClosed = process.env.TEST_MARKET_CLOSED === 'true';
    const testBypassMarketHours = process.env.TEST_BYPASS_MARKET_HOURS === 'true';
    const clock = await alpaca.getClock();
    
    console.log(`🔍 Market Check: isOpen=${clock.is_open}, TEST_MARKET_CLOSED=${testMarketClosed}, TEST_BYPASS_MARKET_HOURS=${testBypassMarketHours}`);
    
    // Only check market hours if not bypassing
    if (!testBypassMarketHours && (testMarketClosed || !clock.is_open)) {
      // Save blocked trade attempt to history
      try {
        const currentPrice = await fetchCurrentPrice(normalizedSymbol).catch(() => 0);
        const positionSize = await calculatePositionSize(normalizedSymbol, accountValue, buyingPower, cash, 100);
        
        const rejectionReason = testMarketClosed 
          ? `TEST MODE: Market closed simulation enabled (TEST_MARKET_CLOSED=true). Real market status: ${clock.is_open ? 'OPEN' : 'CLOSED'}. Set TEST_BYPASS_MARKET_HOURS=true to allow trades.`
          : `Market is currently closed. Trading only occurs during market hours (9:30 AM - 4:00 PM ET). Next open: ${clock.next_open}. Set TEST_BYPASS_MARKET_HOURS=true to bypass this check.`;
        
        const blockedTrade = new Trade({
          timestamp: new Date(),
          symbol: normalizedSymbol,
          side: signal.toLowerCase() as 'buy' | 'sell',
          quantity: positionSize,
          price: currentPrice || 0,
          status: 'blocked',
          rejectionReason: rejectionReason,
          portfolioValue: accountValue,
          cash: parseFloat(account.cash),
          buyingPower: buyingPower,
          equity: parseFloat(account.equity),
          totalValue: positionSize * (currentPrice || 0),
          signalId: signalId || undefined,
        });
        await blockedTrade.save();
      } catch (saveError) {
        console.error('Error saving blocked trade:', saveError);
      }
      
      return NextResponse.json({
        success: false,
        error: testMarketClosed 
          ? 'TEST MODE: Market closed simulation enabled. Set TEST_MARKET_CLOSED=false to disable.'
          : 'Market is currently closed. Trading only occurs during market hours (9:30 AM - 4:00 PM ET)',
        nextOpen: clock.next_open,
        marketStatus: {
          isOpen: false,
          nextOpen: clock.next_open,
          nextClose: clock.next_close,
          testMode: testMarketClosed,
        },
      });
    }
    
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
      currentPosition = await alpaca.getPosition(normalizedSymbol) as AlpacaPosition;
    } catch {
      // No position exists
    }

    const currentQty = currentPosition ? parseInt(currentPosition.qty) : 0;

    // Calculate dynamic position size based on progress to goal
    // Uses MAXIMUM of cash and buying power to maximize position size
    const positionSize = await calculatePositionSize(normalizedSymbol, accountValue, buyingPower, cash, progressToGoal);

    let order = null;

    if (signal === 'BUY') {
      if (currentQty <= 0) {
        // Close any short position first
        if (currentQty < 0) {
          await alpaca.closePosition(normalizedSymbol);
        }

        // Place buy order with calculated position size
        order = await alpaca.createOrder({
          symbol: normalizedSymbol,
          qty: positionSize,
          side: 'buy',
          type: 'market',
          time_in_force: 'day',
        });

        const positionValue = positionSize * (await fetchCurrentPrice(normalizedSymbol).catch(() => 500));
        const maxAvailable = Math.max(buyingPower, cash);
        const sizePercent = maxAvailable > 0 ? (positionValue / maxAvailable) * 100 : BASE_POSITION_SIZE_PERCENT * 100;
        console.log(`✅ AGGRESSIVE BUY order placed: ${positionSize} shares of ${normalizedSymbol} (~$${positionValue.toFixed(2)}, ${sizePercent.toFixed(0)}% of available funds [Cash: $${cash.toFixed(2)}, BP: $${buyingPower.toFixed(2)}])`);
      } else {
        // AGGRESSIVE: Always add to position when we have cash/buying power and signal is BUY
        // This maximizes exposure and opportunities for growth
        // Check if we have available cash OR buying power
        const maxAvailable = Math.max(buyingPower, cash);
        const currentPrice = await fetchCurrentPrice(normalizedSymbol).catch(() => 0);
        
        // Calculate how many shares we can buy with available funds
        let additionalSize = 0;
        if (maxAvailable > accountValue * 0.05 && currentPrice > 0) { // Only need 5% of account value minimum
          // Use the maximum available funds (cash or buying power) to maximize position
          const positionSizePercent = progressToGoal < 80 ? MAX_POSITION_SIZE_PERCENT : BASE_POSITION_SIZE_PERCENT;
          const positionValue = maxAvailable * positionSizePercent;
          additionalSize = Math.floor(positionValue / currentPrice);
          
          if (additionalSize > 0) {
            order = await alpaca.createOrder({
              symbol: normalizedSymbol,
              qty: additionalSize,
              side: 'buy',
              type: 'market',
              time_in_force: 'day',
            });
            const newPositionValue = additionalSize * currentPrice;
            console.log(`📈 AGGRESSIVE: Adding to position: ${additionalSize} shares ($${newPositionValue.toFixed(2)}, using ${(positionSizePercent * 100).toFixed(0)}% of available funds [Cash: $${cash.toFixed(2)}, BP: $${buyingPower.toFixed(2)}])`);
          } else {
            return NextResponse.json({
              success: true,
              message: `Already holding ${currentQty} shares, insufficient funds to add more (Available: $${maxAvailable.toFixed(2)}, Price: $${currentPrice.toFixed(2)})`,
              currentPosition: {
                qty: currentQty,
                symbol: normalizedSymbol,
              },
              growth: {
                current: currentGrowth,
                target: requiredGrowth,
                progress: progressToGoal,
              },
            });
          }
        } else {
          return NextResponse.json({
            success: true,
            message: `Already holding ${currentQty} shares, insufficient funds (Available: $${maxAvailable.toFixed(2)}, Need: $${(accountValue * 0.05).toFixed(2)})`,
            currentPosition: {
              qty: currentQty,
              symbol: normalizedSymbol,
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
        await alpaca.closePosition(normalizedSymbol);

        // Place sell (short) order with calculated position size
        order = await alpaca.createOrder({
          symbol: normalizedSymbol,
          qty: positionSize,
          side: 'sell',
          type: 'market',
          time_in_force: 'day',
        });

        const positionValue = positionSize * (await fetchCurrentPrice(normalizedSymbol).catch(() => 500));
        const maxAvailable = Math.max(buyingPower, cash);
        const sizePercent = maxAvailable > 0 ? (positionValue / maxAvailable) * 100 : BASE_POSITION_SIZE_PERCENT * 100;
        console.log(`✅ AGGRESSIVE SELL order placed: ${positionSize} shares of ${normalizedSymbol} (~$${positionValue.toFixed(2)}, ${sizePercent.toFixed(0)}% of available funds [Cash: $${cash.toFixed(2)}, BP: $${buyingPower.toFixed(2)}])`);
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
      
      // Get updated account info after trade
      const updatedAccount = await alpaca.getAccount() as AlpacaAccount;
      const updatedValue = parseFloat(updatedAccount.portfolio_value);
      const updatedCash = parseFloat(updatedAccount.cash);
      const updatedBuyingPower = parseFloat(updatedAccount.buying_power);
      const updatedEquity = parseFloat(updatedAccount.equity);
      const updatedGrowth = initialValue ? (updatedValue / initialValue) : 1.0;
      
      // Calculate trade value
      const tradePrice = parseFloat(orderData.filled_avg_price || '0');
      const tradeValue = positionSize * tradePrice;
      
      // Calculate P&L if we have previous position data
      let profitLoss = 0;
      let profitLossPercent = 0;
      if (currentPosition && signal === 'SELL' && currentQty > 0) {
        // Use cost_basis to calculate average entry price
        const costBasis = parseFloat(currentPosition.cost_basis || '0');
        const avgEntryPrice = costBasis / currentQty; // cost_basis is total, divide by quantity
        profitLoss = (tradePrice - avgEntryPrice) * currentQty;
        profitLossPercent = avgEntryPrice > 0 ? ((tradePrice - avgEntryPrice) / avgEntryPrice) * 100 : 0;
      }
      
      // Map Alpaca order status to Trade model status
      const tradeStatus = mapAlpacaStatusToTradeStatus(orderData.status);
      
      // Save trade to database with enhanced data
      const trade = new Trade({
        timestamp: new Date(),
        symbol: normalizedSymbol,
        orderId: orderData.id,
        side: signal.toLowerCase() as 'buy' | 'sell',
        quantity: positionSize,
        price: tradePrice,
        status: tradeStatus,
        filledAt: orderData.filled_at ? new Date(orderData.filled_at) : undefined,
        portfolioValue: updatedValue,
        cash: updatedCash,
        buyingPower: updatedBuyingPower,
        equity: updatedEquity,
        totalValue: tradeValue,
        profitLoss,
        profitLossPercent,
        signalId: signalId || undefined,
        rejectionReason: tradeStatus === 'rejected' ? 'Order rejected by broker' : undefined,
      });

      await trade.save();
      
      // Save account snapshot
      const { AccountSnapshot } = await import('@/models/AccountSnapshot');
      await new AccountSnapshot({
        timestamp: new Date(),
        portfolioValue: updatedValue,
        cash: updatedCash,
        buyingPower: updatedBuyingPower,
        equity: updatedEquity,
        accountStatus: updatedAccount.status || 'ACTIVE',
      }).save();

      // Update signal as executed
      if (signalId) {
        await Signal.findByIdAndUpdate(signalId, {
          executed: true,
          orderId: orderData.id,
        });
      }

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
          cash: updatedCash,
          buyingPower: updatedBuyingPower,
          equity: updatedEquity,
        },
        trade: {
          profitLoss,
          profitLossPercent,
          totalValue: tradeValue,
        },
        growth: {
          current: updatedGrowth,
          target: requiredGrowth,
          progress: initialValue ? ((updatedGrowth / requiredGrowth) * 100) : 0,
          goal: `${(GROWTH_TARGET * 100).toFixed(0)}x in ${TARGET_DAYS} days`,
        },
      });
    }

    // No order was placed - save rejected trade attempt
    try {
      const currentPrice = await fetchCurrentPrice(normalizedSymbol).catch(() => 0);
      const positionSize = await calculatePositionSize(normalizedSymbol, accountValue, buyingPower, cash, progressToGoal);
      
      const rejectedTrade = new Trade({
        timestamp: new Date(),
        symbol: normalizedSymbol,
        side: signal.toLowerCase() as 'buy' | 'sell',
        quantity: positionSize,
        price: currentPrice || 0,
        status: 'rejected',
        rejectionReason: 'Failed to place order - no order object returned',
        portfolioValue: accountValue,
        cash: parseFloat(account.cash),
        buyingPower: buyingPower,
        equity: parseFloat(account.equity),
        totalValue: positionSize * (currentPrice || 0),
        signalId: signalId || undefined,
      });
      await rejectedTrade.save();
    } catch (saveError) {
      console.error('Error saving rejected trade:', saveError);
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to place order',
    });
  } catch (error: unknown) {
    console.error('Error executing order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute order';
    
    // Save error trade attempt (only if we have the required variables)
    try {
      const errorSymbol = requestBody.symbol ? requestBody.symbol.toUpperCase().trim() : 'UNKNOWN';
      const errorSignal = (requestBody.signal?.toLowerCase() || 'buy') as 'buy' | 'sell';
      const errorSignalId = requestBody.signalId;
      
      const account = await alpaca.getAccount() as AlpacaAccount;
      const accountValue = parseFloat(account.portfolio_value);
      const buyingPower = parseFloat(account.buying_power);
      const cash = parseFloat(account.cash);
      const currentPrice = await fetchCurrentPrice(errorSymbol).catch(() => 0);
      const positionSize = await calculatePositionSize(errorSymbol, accountValue, buyingPower, cash, 100);
      
      const errorTrade = new Trade({
        timestamp: new Date(),
        symbol: errorSymbol,
        side: errorSignal,
        quantity: positionSize,
        price: currentPrice || 0,
        status: 'rejected',
        rejectionReason: `Error: ${errorMessage}`,
        portfolioValue: accountValue,
        cash: parseFloat(account.cash),
        buyingPower: buyingPower,
        equity: parseFloat(account.equity),
        totalValue: positionSize * (currentPrice || 0),
        signalId: errorSignalId,
      });
      await errorTrade.save();
    } catch (saveError) {
      console.error('Error saving error trade:', saveError);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
