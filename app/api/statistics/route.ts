import connectDB from '@/lib/mongodb';
import { Trade } from '@/models/Trade';
import { Signal } from '@/models/Signal';
import { AccountSnapshot } from '@/models/AccountSnapshot';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    // Build queries
    const tradeQuery = symbol ? { symbol } : {};
    const signalQuery = symbol ? { symbol } : {};

    // Get counts
    const [
      totalTrades,
      totalSignals,
      totalSnapshots,
      tradesBySymbol,
      signalsBySymbol,
      filledTrades,
      executedSignals,
    ] = await Promise.all([
      Trade.countDocuments(tradeQuery),
      Signal.countDocuments(signalQuery),
      AccountSnapshot.countDocuments(),
      Trade.aggregate([
        { $match: tradeQuery },
        { $group: { _id: '$symbol', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Signal.aggregate([
        { $match: signalQuery },
        { $group: { _id: '$symbol', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Trade.countDocuments({ ...tradeQuery, status: 'filled' }),
      Signal.countDocuments({ ...signalQuery, executed: true }),
    ]);

    // Get date ranges
    const [oldestTrade, newestTrade] = await Promise.all([
      Trade.findOne(tradeQuery).sort({ timestamp: 1 }).select('timestamp').lean(),
      Trade.findOne(tradeQuery).sort({ timestamp: -1 }).select('timestamp').lean(),
    ]);

    const [oldestSignal, newestSignal] = await Promise.all([
      Signal.findOne(signalQuery).sort({ timestamp: 1 }).select('timestamp').lean(),
      Signal.findOne(signalQuery).sort({ timestamp: -1 }).select('timestamp').lean(),
    ]);

    return NextResponse.json({
      success: true,
      statistics: {
        trades: {
          total: totalTrades,
          filled: filledTrades,
          bySymbol: tradesBySymbol,
          dateRange: {
            oldest: oldestTrade?.timestamp || null,
            newest: newestTrade?.timestamp || null,
          },
        },
        signals: {
          total: totalSignals,
          executed: executedSignals,
          bySymbol: signalsBySymbol,
          dateRange: {
            oldest: oldestSignal?.timestamp || null,
            newest: newestSignal?.timestamp || null,
          },
        },
        snapshots: {
          total: totalSnapshots,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch statistics',
      },
      { status: 500 }
    );
  }
}

