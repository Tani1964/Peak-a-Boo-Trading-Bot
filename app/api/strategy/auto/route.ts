import alpaca, { AlpacaOrder, AlpacaPosition } from '@/lib/alpaca';
import { calculateIndicators, DEFAULT_CONFIG } from '@/lib/indicators';
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

    // --- Conservative Strategy: Tighter Buy/Sell Rules ---
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    // Only buy if RSI < 35 and MACD > MACD Signal and MACD Histogram > 0
    if (indicators.rsi < 35 && indicators.macd > indicators.macdSignal && indicators.macdHistogram > 0) {
      signal = 'BUY';
    }
    // Only sell if RSI > 65 and MACD < MACD Signal and MACD Histogram < 0
    else if (indicators.rsi > 65 && indicators.macd < indicators.macdSignal && indicators.macdHistogram < 0) {
      signal = 'SELL';
    }
    // Otherwise, hold
    const latestPrice = closePrices[closePrices.length - 1];
    
    console.log(`📈 ${normalizedSymbol}: Signal=${signal}, RSI=${indicators.rsi.toFixed(2)}, MACD=${indicators.macd.toFixed(4)}, Price=$${latestPrice.toFixed(2)}`);

    // Get account info for tracking
    const account = await alpaca.getAccount();
    const portfolioValue = parseFloat(account.portfolio_value || '0');
    const cash = parseFloat(account.cash || '0');
    const buyingPower = parseFloat(account.buying_power || '0');
    const equity = parseFloat(account.equity || '0');

    // --- Risk Management ---
    // Limit position size to 10% of portfolio value
    const maxPositionValue = portfolioValue * 0.1;
    const maxQty = Math.max(1, Math.floor(maxPositionValue / latestPrice));
    // Prevent overtrading: do not enter a new trade if already in a position
    let currentPosition: AlpacaPosition | null = null;
    try {
      currentPosition = await alpaca.getPosition(normalizedSymbol) as AlpacaPosition;
    } catch {}
    const currentQty = currentPosition ? parseInt(currentPosition.qty) : 0;
    // Max daily loss limit: halt trading if loss exceeds 5% of portfolio
    const dailyLossLimit = portfolioValue * 0.05;
    if (portfolioValue < equity - dailyLossLimit) {
      signal = 'HOLD';
      console.log('Daily loss limit reached, halting trading for today.');
    }

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
          // --- Stop-Loss/Take-Profit Logic ---
          // If already in a long position, do not buy more
          if (currentQty > 0) {
            console.log('Already in a long position, skipping buy.');
            order = null;
          } else {
            // Close any short position first if we're short
            if (currentQty < 0) {
              console.log(`🔄 ${normalizedSymbol}: Closing short position before buying...`);
              await alpaca.closePosition(normalizedSymbol);
            }
            // Place buy order (limit position size)
            order = await alpaca.createOrder({
              symbol: normalizedSymbol,
              qty: maxQty,
              side: 'buy',
              type: 'market',
              time_in_force: 'day',
            });
            console.log(`✅ BUY order placed: ${maxQty} shares of ${normalizedSymbol}`);
          }
        } else if (signal === 'SELL') {
          // If already in a short position, do not sell more
          if (currentQty < 0) {
            console.log('Already in a short position, skipping sell.');
            order = null;
          } else {
            // Close long position if we're long
            if (currentQty > 0) {
              console.log(`🔄 ${normalizedSymbol}: Closing long position before selling...`);
              await alpaca.closePosition(normalizedSymbol);
            }
            // Place sell (short) order (limit position size)
            order = await alpaca.createOrder({
              symbol: normalizedSymbol,
              qty: maxQty,
              side: 'sell',
              type: 'market',
              time_in_force: 'day',
            });
            console.log(`✅ SELL order placed: ${maxQty} shares of ${normalizedSymbol}`);
          }
        } else {
          console.log(`⏸️  ${normalizedSymbol}: No action - signal=${signal}, currentQty=${currentQty}`);
        }

        if (order) {
          // --- Stop-Loss/Take-Profit Orders ---
          // After a buy, place a stop-loss and take-profit order (OCO logic)
          // (This is a simplified version; for real OCO, use Alpaca bracket orders if available)
          if (signal === 'BUY') {
            const stopLossPrice = latestPrice * 0.97; // 3% stop loss
            const takeProfitPrice = latestPrice * 1.05; // 5% take profit
            try {
              await alpaca.createOrder({
                symbol: normalizedSymbol,
                qty: maxQty,
                side: 'sell',
                type: 'stop',
                stop_price: stopLossPrice,
                time_in_force: 'gtc',
              });
              await alpaca.createOrder({
                symbol: normalizedSymbol,
                qty: maxQty,
                side: 'sell',
                type: 'limit',
                limit_price: takeProfitPrice,
                time_in_force: 'gtc',
              });
              console.log('Stop-loss and take-profit orders placed.');
            } catch (e) {
              console.error('Failed to place stop-loss/take-profit orders:', e);
            }
          }
        // ...existing code...
          const orderData = order as AlpacaOrder;
          // Poll for order status to be 'filled'
          let finalOrder = orderData;
          let pollCount = 0;
          const maxPolls = 10; // e.g. poll up to 10 times
          const pollDelay = 2000; // 2 seconds between polls
          while (finalOrder.status !== 'filled' && finalOrder.status !== 'canceled' && pollCount < maxPolls) {
            await new Promise(res => setTimeout(res, pollDelay));
            finalOrder = await alpaca.getOrder(orderData.id);
            pollCount++;
          }
          // Get updated account info after trade
          const updatedAccount = await alpaca.getAccount();
          const updatedPortfolioValue = parseFloat(updatedAccount.portfolio_value || '0');
          const updatedCash = parseFloat(updatedAccount.cash || '0');
          const updatedBuyingPower = parseFloat(updatedAccount.buying_power || '0');
          const updatedEquity = parseFloat(updatedAccount.equity || '0');
          // Calculate trade value
          const tradePrice = parseFloat(finalOrder.filled_avg_price || '0');
          const tradeValue = POSITION_SIZE * tradePrice;
          // Map Alpaca order status to Trade model status
          const tradeStatus = mapAlpacaStatusToTradeStatus(finalOrder.status);
          // Save trade to database with enhanced data
          const trade = new Trade({
            timestamp: new Date(),
            symbol: normalizedSymbol,
            orderId: finalOrder.id,
            side: signal.toLowerCase() as 'buy' | 'sell',
            quantity: POSITION_SIZE,
            price: tradePrice,
            status: tradeStatus,
            filledAt: finalOrder.filled_at ? new Date(finalOrder.filled_at) : undefined,
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
          // Update signal as executed if filled
          if (tradeStatus === 'filled') {
            await Signal.findByIdAndUpdate(signalDoc._id, {
              executed: true,
              orderId: finalOrder.id,
            });
          }
          result.executed = tradeStatus === 'filled';
          result.order = {
            id: finalOrder.id,
            symbol: finalOrder.symbol,
            qty: finalOrder.qty,
            side: finalOrder.side,
            type: finalOrder.type,
            status: finalOrder.status,
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

