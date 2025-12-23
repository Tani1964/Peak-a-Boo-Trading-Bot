import connectDB from '@/lib/mongodb';
import { Trade } from '@/models/Trade';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const symbol = searchParams.get('symbol');
    const normalizedSymbol = symbol ? symbol.toUpperCase().trim() : null;

    const query = normalizedSymbol ? { symbol: normalizedSymbol } : {};
    const trades = await Trade.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      trades,
    });
  } catch (error: unknown) {
    console.error('Error fetching trades:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch trades';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
