import connectDB from '@/lib/mongodb';
import { Trade } from '@/models/Trade';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const symbol = searchParams.get('symbol');

    const query = symbol ? { symbol } : {};
    const trades = await Trade.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      trades,
    });
  } catch (error: any) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch trades',
      },
      { status: 500 }
    );
  }
}
