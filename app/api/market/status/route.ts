import { getMarketStatus } from '@/lib/market-hours';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const status = await getMarketStatus();

    return NextResponse.json({
      success: true,
      clock: {
        isOpen: status.isOpen,
        nextOpen: status.nextOpen,
        nextClose: status.nextClose,
        source: status.source,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching market status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch market status';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
