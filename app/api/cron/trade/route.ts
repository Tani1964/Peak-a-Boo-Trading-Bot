import { NextRequest, NextResponse } from 'next/server';

// Symbols to trade on each cron tick — override via TRADING_SYMBOLS env var
const DEFAULT_SYMBOLS = ['SPY'];

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — Vercel Pro allows up to 300s

export async function GET(request: NextRequest) {
  // Vercel injects Authorization: Bearer <CRON_SECRET> automatically.
  // Manually triggered calls must supply the same header.
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const symbolsEnv = process.env.TRADING_SYMBOLS;
  const symbols = symbolsEnv
    ? symbolsEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_SYMBOLS;

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const results: Record<string, unknown> = {};
  const BATCH_SIZE = 50;

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (symbol) => {
        try {
          const res = await fetch(`${baseUrl}/api/strategy/auto`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-secret': process.env.AUTO_TRADE_SECRET ?? '',
            },
            body: JSON.stringify({ symbol, autoExecute: true }),
          });
          results[symbol] = await res.json();
        } catch (err) {
          results[symbol] = { error: err instanceof Error ? err.message : 'Unknown error' };
        }
      })
    );
  }

  return NextResponse.json({ success: true, results });
}
