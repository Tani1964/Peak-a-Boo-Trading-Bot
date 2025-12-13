import alpaca from '@/lib/alpaca';
import connectDB from '@/lib/mongodb';
import { AccountSnapshot } from '@/models/AccountSnapshot';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get account info from Alpaca
    const account = await alpaca.getAccount();

    // Save snapshot to database
    const snapshot = new AccountSnapshot({
      timestamp: new Date(),
      portfolioValue: parseFloat(account.portfolio_value),
      cash: parseFloat(account.cash),
      buyingPower: parseFloat(account.buying_power),
      equity: parseFloat(account.equity),
      dayTradeCount: account.daytrade_count,
      accountStatus: account.status,
    });

    await snapshot.save();

    return NextResponse.json({
      success: true,
      account: {
        status: account.status,
        portfolioValue: parseFloat(account.portfolio_value),
        cash: parseFloat(account.cash),
        buyingPower: parseFloat(account.buying_power),
        equity: parseFloat(account.equity),
        dayTradeCount: account.daytrade_count,
      },
    });
  } catch (error: any) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch account information',
      },
      { status: 500 }
    );
  }
}
