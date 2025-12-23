import alpaca, { AlpacaPosition } from '@/lib/alpaca';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    // Get positions from Alpaca
    const positions = await alpaca.getPositions() as AlpacaPosition[];

    const formattedPositions = positions.map((pos: AlpacaPosition) => ({
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
  } catch (error: unknown) {
    console.error('Error fetching positions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch positions';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
