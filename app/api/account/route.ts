import alpaca, { AlpacaAccount } from '@/lib/alpaca';
import connectDB from '@/lib/mongodb';
import { AccountSnapshot } from '@/models/AccountSnapshot';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    // Get account info from Alpaca
    const account = await alpaca.getAccount() as AlpacaAccount;

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

    // Calculate growth metrics (3x in 30 days goal)
    const portfolioValue = parseFloat(account.portfolio_value);
    const firstSnapshot = await AccountSnapshot.findOne().sort({ timestamp: 1 });
    const initialValue = firstSnapshot ? firstSnapshot.portfolioValue : portfolioValue;
    const currentGrowth = initialValue > 0 ? portfolioValue / initialValue : 1.0;
    const daysElapsed = firstSnapshot 
      ? Math.max(1, Math.floor((Date.now() - firstSnapshot.timestamp.getTime()) / (1000 * 60 * 60 * 24)))
      : 1;
    const GROWTH_TARGET = 3.0;
    const TARGET_DAYS = 30;
    const requiredGrowth = Math.pow(GROWTH_TARGET, daysElapsed / TARGET_DAYS);
    const progressToGoal = initialValue > 0 ? (currentGrowth / requiredGrowth) * 100 : 0;

    return NextResponse.json({
      success: true,
      account: {
        status: account.status,
        portfolioValue,
        cash: parseFloat(account.cash),
        buyingPower: parseFloat(account.buying_power),
        equity: parseFloat(account.equity),
        dayTradeCount: account.daytrade_count,
      },
      growth: {
        initialValue,
        currentValue: portfolioValue,
        currentGrowth: currentGrowth,
        targetGrowth: requiredGrowth,
        progress: progressToGoal,
        goal: `${(GROWTH_TARGET * 100).toFixed(0)}x in ${TARGET_DAYS} days`,
        daysElapsed,
        daysRemaining: Math.max(0, TARGET_DAYS - daysElapsed),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch account information';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
