import connectDB from '@/lib/mongodb';
import { Trade, ITrade } from '@/models/Trade';
import { Signal, ISignal } from '@/models/Signal';
import { AccountSnapshot } from '@/models/AccountSnapshot';
import { NextRequest, NextResponse } from 'next/server';
import { FilterQuery } from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : null;

    // Calculate date range - if days is very large or not specified, fetch all data
    const endDate = new Date();
    const startDate = days && days < 3650 ? (() => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date;
    })() : null; // null means fetch all data

    // Build queries
    const tradeQuery: FilterQuery<ITrade> = startDate ? { timestamp: { $gte: startDate } } : {};
    const signalQuery: FilterQuery<ISignal> = startDate ? { timestamp: { $gte: startDate } } : {};
    const snapshotQuery: FilterQuery<any> = startDate ? { timestamp: { $gte: startDate } } : {};
    
    if (symbol) {
      tradeQuery.symbol = symbol;
      signalQuery.symbol = symbol;
    }

    // Fetch data
    const [trades, signals, snapshots] = await Promise.all([
      Trade.find(tradeQuery).sort({ timestamp: 1 }).lean(),
      Signal.find(signalQuery).sort({ timestamp: 1 }).lean(),
      AccountSnapshot.find(snapshotQuery).sort({ timestamp: 1 }).lean(),
    ]);

    // Calculate performance metrics
    const filledTrades = trades.filter(t => t.status === 'filled');
    const buyTrades = filledTrades.filter(t => t.side === 'buy');
    const sellTrades = filledTrades.filter(t => t.side === 'sell');

    // Calculate win rate (for closed positions)
    let winningTrades = 0;
    let losingTrades = 0;
    let totalProfitLoss = 0;
    
    // Match buy and sell trades to calculate P&L
    const positionMap = new Map<string, { buy: ITrade | null; sell: ITrade | null }>();
    
    filledTrades.forEach(trade => {
      const key = trade.symbol;
      if (!positionMap.has(key)) {
        positionMap.set(key, { buy: null, sell: null });
      }
      
      const position = positionMap.get(key)!;
      if (trade.side === 'buy' && !position.buy) {
        position.buy = trade;
      } else if (trade.side === 'sell' && position.buy) {
        position.sell = trade;
      }
    });

    positionMap.forEach((position, _symbol) => {
      if (position.buy && position.sell) {
        const profitLoss = (position.sell.price - position.buy.price) * position.buy.quantity;
        totalProfitLoss += profitLoss;
        if (profitLoss > 0) {
          winningTrades++;
        } else if (profitLoss < 0) {
          losingTrades++;
        }
      }
    });

    const totalClosedTrades = winningTrades + losingTrades;
    const winRate = totalClosedTrades > 0 ? (winningTrades / totalClosedTrades) * 100 : 0;

    // Calculate portfolio performance
    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1] || firstSnapshot;
    
    let portfolioReturn = 0;
    let portfolioReturnPercent = 0;
    if (firstSnapshot && lastSnapshot) {
      portfolioReturn = lastSnapshot.portfolioValue - firstSnapshot.portfolioValue;
      portfolioReturnPercent = firstSnapshot.portfolioValue > 0 
        ? ((lastSnapshot.portfolioValue - firstSnapshot.portfolioValue) / firstSnapshot.portfolioValue) * 100 
        : 0;
    }

    // Calculate signal statistics
    const buySignals = signals.filter(s => s.signal === 'BUY');
    const sellSignals = signals.filter(s => s.signal === 'SELL');
    const holdSignals = signals.filter(s => s.signal === 'HOLD');
    const executedSignals = signals.filter(s => s.executed);

    // Calculate average indicators for signals
    const avgRSI = signals.length > 0 
      ? signals.reduce((sum, s) => sum + s.rsi, 0) / signals.length 
      : 0;
    const avgMACD = signals.length > 0 
      ? signals.reduce((sum, s) => sum + s.macd, 0) / signals.length 
      : 0;

    // Prepare chart data
    const portfolioChartData = snapshots.map(s => ({
      timestamp: s.timestamp,
      portfolioValue: s.portfolioValue,
      equity: s.equity,
      cash: s.cash,
    }));

    const tradeChartData = filledTrades.map(t => ({
      timestamp: t.timestamp,
      symbol: t.symbol,
      side: t.side,
      price: t.price,
      quantity: t.quantity,
      totalValue: t.totalValue || (t.price * t.quantity),
      profitLoss: t.profitLoss || 0,
      profitLossPercent: t.profitLossPercent || 0,
    }));

    const signalChartData = signals.map(s => ({
      timestamp: s.timestamp,
      symbol: s.symbol,
      signal: s.signal,
      closePrice: s.closePrice,
      rsi: s.rsi,
      macd: s.macd,
      macdSignal: s.macdSignal,
      macdHistogram: s.macdHistogram,
      executed: s.executed,
    }));

    return NextResponse.json({
      success: true,
      metrics: {
        // Trade metrics
        totalTrades: filledTrades.length,
        buyTrades: buyTrades.length,
        sellTrades: sellTrades.length,
        winningTrades,
        losingTrades,
        winRate: parseFloat(winRate.toFixed(2)),
        totalProfitLoss: parseFloat(totalProfitLoss.toFixed(2)),
        
        // Portfolio metrics
        portfolioReturn: parseFloat(portfolioReturn.toFixed(2)),
        portfolioReturnPercent: parseFloat(portfolioReturnPercent.toFixed(2)),
        currentPortfolioValue: lastSnapshot?.portfolioValue || 0,
        initialPortfolioValue: firstSnapshot?.portfolioValue || 0,
        
        // Signal metrics
        totalSignals: signals.length,
        buySignals: buySignals.length,
        sellSignals: sellSignals.length,
        holdSignals: holdSignals.length,
        executedSignals: executedSignals.length,
        executionRate: signals.length > 0 
          ? parseFloat(((executedSignals.length / signals.length) * 100).toFixed(2))
          : 0,
        
        // Indicator averages
        avgRSI: parseFloat(avgRSI.toFixed(2)),
        avgMACD: parseFloat(avgMACD.toFixed(4)),
      },
      chartData: {
        portfolio: portfolioChartData,
        trades: tradeChartData,
        signals: signalChartData,
      },
      period: {
        startDate: startDate || (snapshots.length > 0 ? snapshots[0].timestamp : null),
        endDate,
        days: days || (startDate ? null : 'all'),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching performance data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch performance data';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

