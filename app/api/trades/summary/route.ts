import connectDB from '@/lib/mongodb';
import { Trade } from '@/models/Trade';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  await connectDB();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trades = await Trade.find({ timestamp: { $gte: since } }).sort({ timestamp: -1 }).lean();
    const _request = request; // Prefixing unused argument with '_'

  return NextResponse.json({
    count: trades.length,
    trades: trades.map(t => ({
      symbol: t.symbol,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      status: t.status,
      timestamp: t.timestamp,
      filledAt: t.filledAt,
      profitLoss: t.profitLoss,
      profitLossPercent: t.profitLossPercent,
      orderId: t.orderId,
      signalId: t.signalId,
      rejectionReason: t.rejectionReason,
    }))
  });
}
