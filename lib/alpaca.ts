import Alpaca from '@alpacahq/alpaca-trade-api';

let alpacaInstance: Alpaca | null = null;

function getAlpaca(): Alpaca {
  if (!alpacaInstance) {
    const alpacaConfig = {
      keyId: process.env.ALPACA_API_KEY || '',
      secretKey: process.env.ALPACA_SECRET_KEY || '',
      paper: process.env.ALPACA_BASE_URL?.includes('paper') ?? true,
      baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
    };

    if (!alpacaConfig.keyId || !alpacaConfig.secretKey) {
      throw new Error('Alpaca API credentials not configured');
    }

    alpacaInstance = new Alpaca(alpacaConfig);
  }

  return alpacaInstance;
}

// Export a Proxy that lazily initializes - this avoids throwing during module load
// The Proxy will only initialize when a method is actually called
const alpacaProxy = new Proxy({} as Alpaca, {
  get(_target, prop: string | symbol) {
    const instance = getAlpaca();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export default alpacaProxy;

export interface AlpacaAccount {
  id: string;
  status: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  daytrading_buying_power: string;
  daytrade_count: number;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  qty: string;
  side: 'long' | 'short';
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at?: string;
  expired_at?: string;
  canceled_at?: string;
  failed_at?: string;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  type: string;
  side: 'buy' | 'sell';
  time_in_force: string;
  limit_price?: string;
  stop_price?: string;
  filled_avg_price?: string;
  status: string;
}
