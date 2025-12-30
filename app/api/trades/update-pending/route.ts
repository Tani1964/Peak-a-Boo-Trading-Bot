import alpaca from '@/lib/alpaca';
import connectDB from '@/lib/mongodb';
import { Trade } from '@/models/Trade';
import { NextRequest, NextResponse } from 'next/server';

// This endpoint updates all trades with status 'pending' by checking Alpaca for their latest status
export async function POST(request: NextRequest) {
  await connectDB();
  const pendingTrades = await Trade.find({ status: 'pending', orderId: { $exists: true, $ne: null } });
  let updated = 0;

  for (const trade of pendingTrades) {
    try {
      const order = await alpaca.getOrder(trade.orderId);
      const newStatus = order.status;
      if (newStatus && newStatus !== 'pending') {
        trade.status = newStatus === 'filled' || newStatus === 'partially_filled' ? 'filled'
          : newStatus === 'canceled' || newStatus === 'cancelled' || newStatus === 'expired' || newStatus === 'replaced' ? 'cancelled'
          : newStatus === 'rejected' || newStatus === 'failed' ? 'rejected'
          : 'pending';
        if (order.filled_at) trade.filledAt = new Date(order.filled_at);
        if (order.filled_avg_price) trade.price = parseFloat(order.filled_avg_price);
        await trade.save();
        updated++;
      }
    } catch (e) {
      // log error, but continue
      console.error(`Failed to update trade ${trade._id}:`, e);
    }
  }

  return NextResponse.json({ updated });
}
