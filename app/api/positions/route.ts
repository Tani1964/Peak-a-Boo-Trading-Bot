import alpaca from '@/lib/alpaca';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get positions from Alpaca
    const positions = await alpaca.getPositions();

    const formattedPositions = positions.map((pos: any) => ({
      symbol: pos.symbol,
      qty: parseFloat(pos.qty),
      side: pos.side,
      marketValue: parseFloat(pos.market_value),
      costBasis: parseFloat(pos.cost_basis),
      unrealizedPL: parseFloat(pos.unrealized_pl),
      unrealizedPLPercent: parseFloat(pos.unrealized_plpc) * 100,
      currentPrice: parseFloat(pos.current_price),
    }));

    return NextResponse.json({
      success: true,
      positions: formattedPositions,
    });
  } catch (error: any) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch positions',
      },
      { status: 500 }
    );
  }
}
