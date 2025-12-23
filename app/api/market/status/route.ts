import alpaca from '@/lib/alpaca';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    const clock = await alpaca.getClock();

    return NextResponse.json({
      success: true,
      clock: {
        isOpen: clock.is_open,
        nextOpen: clock.next_open,
        nextClose: clock.next_close,
      },
    });
  } catch (error: any) {
    console.error('Error fetching market status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch market status',
      },
      { status: 500 }
    );
  }
}
