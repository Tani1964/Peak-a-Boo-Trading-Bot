import alpaca, { AlpacaOrder, AlpacaPosition } from '@/lib/alpaca';
import { calculateIndicators, DEFAULT_CONFIG, generateSignal } from '@/lib/indicators';
import connectDB from '@/lib/mongodb';
import { fetchHistoricalData } from '@/lib/yahoo-finance';
import { Signal } from '@/models/Signal';
import { Trade } from '@/models/Trade';
import { NextRequest, NextResponse } from 'next/server';

const POSITION_SIZE = 1;

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
 * Automated trading endpoint that analyzes and executes trades
 * Designed to be called by scheduled services (GitHub Actions, cron jobs, etc.)
 * 
 * Requires API_SECRET token in header for security
 */
export async function POST(request: NextRequest) {
  let normalizedSymbol = 'UNKNOWN';
  
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
    normalizedSymbol = symbol.toUpperCase().trim();

    console.log(`🔄 Auto-trading: Processing symbol ${normalizedSymbol} (original: ${symbol})`);

    // Check if market is open (we'll still analyze even if closed, but only execute when open)
    // Alpaca API uses US Eastern Time (ET) for market hours
    const clock = await alpaca.getClock();
    const isMarketOpen = clock.is_open;
    
    // Log market status with times in ET
    const currentTimeET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    console.log(`📅 Market Status Check (ET): Current time: ${currentTimeET}, Market open: ${isMarketOpen}`);
    console.log(`📅 Market Times (from Alpaca API): Next open: ${clock.next_open}, Next close: ${clock.next_close}`);
    
    if (!isMarketOpen) {
      console.log(`⏸️  Market closed for ${normalizedSymbol} - will analyze but skip execution`);
    } else {
      console.log(`✅ Market is open - will analyze and execute trades if signal is not HOLD`);
    }

    // Fetch historical data (last 6 months for sufficient indicator calculation)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    console.log(`📊 Fetching historical data for ${normalizedSymbol}...`);
    const historicalData = await fetchHistoricalData(normalizedSymbol, startDate, endDate);

    if (historicalData.length === 0) {
      console.error(`❌ No market data available for ${normalizedSymbol}`);
      return NextResponse.json(
        {
          success: false,
          error: 'No market data available',
          symbol: normalizedSymbol,
        },
        { status: 400 }
      );
    }

    console.log(`✅ Fetched ${historicalData.length} data points for ${normalizedSymbol}`);

    // Calculate technical indicators
    const closePrices = historicalData.map((d) => d.close);
    const indicators = calculateIndicators(closePrices, DEFAULT_CONFIG);

    if (!indicators) {
      console.error(`❌ Insufficient data to calculate indicators for ${normalizedSymbol}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient data to calculate indicators',
          symbol: normalizedSymbol,
        },
        { status: 400 }
      );
    }

    // Generate trading signal
    const signal = generateSignal(indicators) as 'BUY' | 'SELL' | 'HOLD';
    const latestPrice = closePrices[closePrices.length - 1];
    
    console.log(`📈 ${normalizedSymbol}: Signal=${signal}, RSI=${indicators.rsi.toFixed(2)}, MACD=${indicators.macd.toFixed(4)}, Price=$${latestPrice.toFixed(2)}`);

    // Get account info for tracking
    const account = await alpaca.getAccount();
    const portfolioValue = parseFloat(account.portfolio_value || '0');
    const cash = parseFloat(account.cash || '0');
    const buyingPower = parseFloat(account.buying_power || '0');
    const equity = parseFloat(account.equity || '0');

    // Save signal to database
    const signalDoc = new Signal({
      timestamp: new Date(),
      symbol: normalizedSymbol,
      signal,
      closePrice: latestPrice,
      rsi: indicators.rsi,
      macd: indicators.macd,
      macdSignal: indicators.macdSignal,
      macdHistogram: indicators.macdHistogram,
      executed: false,
    });

    await signalDoc.save();
    console.log(`💾 Saved ${signal} signal for ${normalizedSymbol} (ID: ${signalDoc._id})`);
    
    // Save account snapshot for tracking (even if signal not executed)
    const { AccountSnapshot } = await import('@/models/AccountSnapshot');
    await new AccountSnapshot({
      timestamp: new Date(),
      portfolioValue,
      cash,
      buyingPower,
      equity,
      accountStatus: account.status || 'ACTIVE',
    }).save();

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
        accountSnapshot?: {
          portfolioValue: number;
          cash: number;
          buyingPower: number;
          equity: number;
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
      nextOpen?: string;
    }

    const result: AutoTradeResult = {
      success: true,
      signal: {
        id: signalDoc._id.toString(),
        timestamp: signalDoc.timestamp,
        symbol: normalizedSymbol,
        signal,
        closePrice: latestPrice,
        indicators: {
          rsi: indicators.rsi,
          macd: indicators.macd,
          macdSignal: indicators.macdSignal,
          macdHistogram: indicators.macdHistogram,
        },
        accountSnapshot: {
          portfolioValue,
          cash,
          buyingPower,
          equity,
        },
      },
      executed: false,
    };

    // Auto-execute if enabled and signal is not HOLD
    if (signal === 'HOLD') {
      console.log(`⏸️  ${normalizedSymbol}: HOLD signal - no trade executed`);
      result.message = 'HOLD signal - no action taken';
    } else if (autoExecute && isMarketOpen) {
      console.log(`🚀 ${normalizedSymbol}: ${signal} signal - attempting to execute trade...`);
      try {
        // Check current position
        let currentPosition: AlpacaPosition | null = null;
        try {
          currentPosition = await alpaca.getPosition(normalizedSymbol) as AlpacaPosition;
        } catch {
          // No position exists
        }

        const currentQty = currentPosition ? parseInt(currentPosition.qty) : 0;
        console.log(`📊 ${normalizedSymbol}: Current position = ${currentQty} shares`);
        let order = null;

        if (signal === 'BUY') {
          // Close any short position first if we're short
          if (currentQty < 0) {
            console.log(`🔄 ${normalizedSymbol}: Closing short position before buying...`);
            await alpaca.closePosition(normalizedSymbol);
          }

          // Place buy order (allows accumulating more shares if already long)
          order = await alpaca.createOrder({
            symbol: normalizedSymbol,
            qty: POSITION_SIZE,
            side: 'buy',
            type: 'market',
            time_in_force: 'day',
          });

          console.log(`✅ BUY order placed: ${POSITION_SIZE} shares of ${normalizedSymbol}`);
        } else if (signal === 'SELL') {
          // Close long position if we're long
          if (currentQty > 0) {
            console.log(`🔄 ${normalizedSymbol}: Closing long position before selling...`);
            await alpaca.closePosition(normalizedSymbol);
          }

          // Place sell (short) order (allows accumulating more short shares if already short)
          order = await alpaca.createOrder({
            symbol: normalizedSymbol,
            qty: POSITION_SIZE,
            side: 'sell',
            type: 'market',
            time_in_force: 'day',
          });

          console.log(`✅ SELL order placed: ${POSITION_SIZE} shares of ${normalizedSymbol}`);
        } else {
          console.log(`⏸️  ${normalizedSymbol}: No action - signal=${signal}, currentQty=${currentQty}`);
        }

        if (order) {
          const orderData = order as AlpacaOrder;
          
          // Get updated account info after trade
          const updatedAccount = await alpaca.getAccount();
          const updatedPortfolioValue = parseFloat(updatedAccount.portfolio_value || '0');
          const updatedCash = parseFloat(updatedAccount.cash || '0');
          const updatedBuyingPower = parseFloat(updatedAccount.buying_power || '0');
          const updatedEquity = parseFloat(updatedAccount.equity || '0');
          
          // Calculate trade value
          const tradePrice = parseFloat(orderData.filled_avg_price || '0');
          const tradeValue = POSITION_SIZE * tradePrice;
          
          // Map Alpaca order status to Trade model status
          const tradeStatus = mapAlpacaStatusToTradeStatus(orderData.status);
          
          // Save trade to database with enhanced data
          const trade = new Trade({
            timestamp: new Date(),
            symbol: normalizedSymbol,
            orderId: orderData.id,
            side: signal.toLowerCase() as 'buy' | 'sell',
            quantity: POSITION_SIZE,
            price: tradePrice,
            status: tradeStatus,
            filledAt: orderData.filled_at ? new Date(orderData.filled_at) : new Date(),
            portfolioValue: updatedPortfolioValue,
            cash: updatedCash,
            buyingPower: updatedBuyingPower,
            equity: updatedEquity,
            totalValue: tradeValue,
            signalId: signalDoc._id.toString(),
          });

          await trade.save();
          
          // Save account snapshot
          const { AccountSnapshot } = await import('@/models/AccountSnapshot');
          await new AccountSnapshot({
            timestamp: new Date(),
            portfolioValue: updatedPortfolioValue,
            cash: updatedCash,
            buyingPower: updatedBuyingPower,
            equity: updatedEquity,
            accountStatus: updatedAccount.status || 'ACTIVE',
          }).save();

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
          // This should not happen with BUY/SELL signals, but kept as fallback
          result.message = `Unexpected state: signal=${signal}, currentQty=${currentQty}, no order created`;
        }
      } catch (executeError: unknown) {
        result.executeError = executeError instanceof Error ? executeError.message : 'Unknown error executing order';
        console.error(`❌ Error executing order for ${normalizedSymbol}:`, executeError);
      }
    } else if (autoExecute && !isMarketOpen) {
      console.log(`⏸️  ${normalizedSymbol}: Market is closed - signal generated but trade not executed`);
      result.message = `Market is currently closed - ${signal} signal generated but trade not executed. Next open: ${clock.next_open}`;
      result.nextOpen = clock.next_open;
    }

    console.log(`✅ Completed processing ${normalizedSymbol}: signal=${signal}, executed=${result.executed}`);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error(`❌ Error in auto trading for ${normalizedSymbol}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute auto trading';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        symbol: normalizedSymbol,
      },
      { status: 500 }
    );
  }
}

