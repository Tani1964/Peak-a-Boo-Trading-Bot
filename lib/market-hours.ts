import alpaca from './alpaca';

export interface MarketStatus {
  isOpen: boolean;
  nextOpen: string;
  nextClose: string;
  source: 'alpaca' | 'fallback';
  raw?: Record<string, unknown>;
}

// Timezone-based fallback — does not account for holidays
function isMarketOpenByTime(): boolean {
  const etNow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  const day = etNow.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const minutes = etNow.getHours() * 60 + etNow.getMinutes();
  return minutes >= 570 && minutes < 960; // 9:30–16:00 ET
}

export async function getMarketStatus(): Promise<MarketStatus> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clock: any = await alpaca.getClock();

    console.log('[market-hours] raw clock response:', JSON.stringify(clock));

    // Alpaca REST API uses snake_case; some SDK wrappers use camelCase — handle both
    const isOpen: boolean =
      clock.is_open ?? clock.isOpen ?? isMarketOpenByTime();
    const nextOpen: string = clock.next_open ?? clock.nextOpen ?? '';
    const nextClose: string = clock.next_close ?? clock.nextClose ?? '';

    return { isOpen, nextOpen, nextClose, source: 'alpaca', raw: clock };
  } catch (err) {
    console.warn('[market-hours] getClock() failed — using timezone fallback:', err);
    return {
      isOpen: isMarketOpenByTime(),
      nextOpen: '',
      nextClose: '',
      source: 'fallback',
    };
  }
}
