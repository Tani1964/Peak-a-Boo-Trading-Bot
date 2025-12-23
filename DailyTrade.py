import yfinance as yf
import pandas_ta as ta
from datetime import datetime
import schedule
import time
import os
import alpaca_trade_api as tradeapi
import pandas as pd

# Alpaca Configuration
# Get these from: https://app.alpaca.markets/paper/dashboard/overview
ALPACA_API_KEY = "PKUSUUF7FCJ5XJFSDU3S3BCVTV"
ALPACA_SECRET_KEY = "DNuPqXSm9KEgtC9YY68via9HffeAycYim6gDVm6cojBM"
ALPACA_BASE_URL = "https://paper-api.alpaca.markets"  # Paper trading (demo)
# For live trading use: "https://api.alpaca.markets"

# Trading Parameters
SYMBOL = "SPY"  # S&P 500 ETF
# Goal: Triple account in 30 days (3x growth)
GROWTH_TARGET = 3.0  # 3x = 300% return
TARGET_DAYS = 30
POSITION_SIZE_PERCENT = 0.5  # Use 50% of buying power per trade (aggressive)
MIN_POSITION_SIZE = 1  # Minimum 1 share

# Strategy Parameters
RSI_PERIOD = 14
MACD_FAST = 12
MACD_SLOW = 26
MACD_SIGNAL = 9

CSV_FILE = "alpaca_trading_signals.csv"

# Initialize Alpaca API
api = None


def initialize_alpaca():
    """Initialize Alpaca connection"""
    global api
    try:
        api = tradeapi.REST(
            ALPACA_API_KEY, ALPACA_SECRET_KEY, ALPACA_BASE_URL, api_version="v2"
        )

        # Get account info
        account = api.get_account()
        print("✅ Connected to Alpaca Account")
        print(f"   Account Status: {account.status}")
        print(f"   Buying Power: ${float(account.buying_power):,.2f}")
        print(f"   Portfolio Value: ${float(account.portfolio_value):,.2f}")
        print(f"   Cash: ${float(account.cash):,.2f}")
        return True
    except Exception as e:
        print(f"❌ Failed to connect to Alpaca: {e}")
        return False


def close_all_positions(symbol):
    """Close all open positions for the symbol"""
    try:
        positions = api.list_positions()
        for position in positions:
            if position.symbol == symbol:
                qty = abs(int(position.qty))
                side = "sell" if int(position.qty) > 0 else "buy"

                api.submit_order(
                    symbol=symbol,
                    qty=qty,
                    side=side,
                    type="market",
                    time_in_force="day",
                )
                print(f"✅ Closed {qty} shares of {symbol}")
        return True
    except Exception as e:
        print(f"❌ Error closing positions: {e}")
        return False


def calculate_position_size(symbol, buying_power):
    """Calculate position size based on buying power and growth goals"""
    try:
        # Get current price
        bars = api.get_bars(symbol, "1Day", limit=1)
        if not bars or len(bars) == 0:
            # Fallback: use a reasonable default price estimate (SPY is typically $400-600)
            return max(MIN_POSITION_SIZE, int((buying_power * POSITION_SIZE_PERCENT) / 500))
        
        current_price = float(bars[-1].c)
        if current_price <= 0:
            return MIN_POSITION_SIZE
        
        # Calculate position size: use percentage of buying power
        position_value = buying_power * POSITION_SIZE_PERCENT
        shares = int(position_value / current_price)
        
        return max(MIN_POSITION_SIZE, shares)
    except Exception as e:
        print(f"⚠️  Error calculating position size: {e}")
        # Fallback to conservative estimate
        return max(MIN_POSITION_SIZE, int((buying_power * POSITION_SIZE_PERCENT) / 500))


def place_order(signal, symbol):
    """Place order based on signal with dynamic position sizing"""
    if api is None:
        print("❌ Alpaca API not initialized")
        return False

    try:
        # Get account info for position sizing
        account = api.get_account()
        buying_power = float(account.buying_power)
        portfolio_value = float(account.portfolio_value)
        
        # Check current positions
        try:
            position = api.get_position(symbol)
            current_qty = int(position.qty)
        except:
            current_qty = 0

        # Calculate dynamic position size
        position_size = calculate_position_size(symbol, buying_power)

        if signal == "BUY":
            if current_qty <= 0:
                # Close any short position first
                if current_qty < 0:
                    close_all_positions(symbol)

                # Place buy order with calculated position size
                order = api.submit_order(
                    symbol=symbol,
                    qty=position_size,
                    side="buy",
                    type="market",
                    time_in_force="day",
                )
                position_value = position_size * (float(api.get_bars(symbol, "1Day", limit=1)[-1].c) if api.get_bars(symbol, "1Day", limit=1) else 500)
                print(f"✅ BUY order placed: {position_size} shares of {symbol} (~${position_value:.2f}, {POSITION_SIZE_PERCENT*100:.0f}% of buying power)")
                return True
            else:
                print(f"📊 Already holding {current_qty} shares of {symbol}")
                return True

        elif signal == "SELL":
            if current_qty > 0:
                # Close long position
                close_all_positions(symbol)

                # Place sell (short) order with calculated position size
                order = api.submit_order(
                    symbol=symbol,
                    qty=position_size,
                    side="sell",
                    type="market",
                    time_in_force="day",
                )
                position_value = position_size * (float(api.get_bars(symbol, "1Day", limit=1)[-1].c) if api.get_bars(symbol, "1Day", limit=1) else 500)
                print(f"✅ SELL order placed: {position_size} shares of {symbol} (~${position_value:.2f}, {POSITION_SIZE_PERCENT*100:.0f}% of buying power)")
                return True
            else:
                print("📊 No position to sell or already short")
                return True

        elif signal == "HOLD":
            print("📊 Signal: HOLD - No action taken")
            if current_qty != 0:
                print(f"   Current position: {current_qty} shares")
            return True

    except Exception as e:
        print(f"❌ Error placing order: {e}")
        return False


def run_strategy():
    """Main strategy function"""
    print(f"\n{'='*60}")
    print(f"Running strategy at {datetime.now()}")
    print(f"{'='*60}")

    # Check if market is open
    try:
        clock = api.get_clock()
        if not clock.is_open:
            print("⏰ Market is currently closed")
            next_open = clock.next_open
            print(f"   Next market open: {next_open}")
            return
    except Exception as e:
        print(f"⚠️  Could not check market status: {e}")

    # Download market data
    data = yf.download(
        SYMBOL,
        start="2023-06-01",
        end=datetime.today().strftime("%Y-%m-%d"),
        interval="1d",
        progress=False,
    )

    if data.empty:
        print("❌ Failed to download market data")
        return

    # Calculate indicators
    data["RSI"] = ta.rsi(data["Close"], length=RSI_PERIOD)
    macd = ta.macd(data["Close"], fast=MACD_FAST, slow=MACD_SLOW, signal=MACD_SIGNAL)
    data["MACD"] = macd["MACD_12_26_9"]
    data["MACD_Signal"] = macd["MACDs_12_26_9"]
    data["MACD_Histogram"] = data["MACD"] - data["MACD_Signal"]  # Calculate histogram

    # Generate signal - AGGRESSIVE STRATEGY for 3x growth in 30 days
    def generate_signal(row):
        rsi = row["RSI"]
        macd = row["MACD"]
        macd_signal = row["MACD_Signal"]
        macd_histogram = row["MACD_Histogram"]
        
        # More aggressive buy signals (wider RSI bands)
        if rsi < 40 and macd > macd_signal:
            return "BUY"
        # Buy on MACD bullish crossover even with moderate RSI
        if rsi < 55 and macd > macd_signal and macd_histogram > 0:
            return "BUY"
        
        # More aggressive sell signals (wider RSI bands)
        if rsi > 60 and macd < macd_signal:
            return "SELL"
        # Sell on MACD bearish crossover even with moderate RSI
        if rsi > 45 and macd < macd_signal and macd_histogram < 0:
            return "SELL"
        
        return "HOLD"

    data["Signal"] = data.apply(generate_signal, axis=1)
    latest_signal = data.iloc[-1]["Signal"]
    latest_rsi = data.iloc[-1]["RSI"]
    latest_macd = data.iloc[-1]["MACD"]
    latest_macd_signal = data.iloc[-1]["MACD_Signal"]
    latest_close = data.iloc[-1]["Close"]

    print("\n📊 Market Analysis:")
    print(f"   Symbol: {SYMBOL}")
    print(f"   Close Price: ${latest_close:.2f}")
    print(f"   RSI: {latest_rsi:.2f}")
    print(f"   MACD: {latest_macd:.4f}")
    print(f"   MACD Signal: {latest_macd_signal:.4f}")
    print(f"   Signal: {latest_signal}")

    # Place order
    place_order(latest_signal, SYMBOL)

    # Get current account status and growth metrics
    try:
        account = api.get_account()
        portfolio_value = float(account.portfolio_value)
        print("\n💼 Account Status:")
        print(f"   Portfolio Value: ${portfolio_value:,.2f}")
        print(f"   Cash: ${float(account.cash):,.2f}")
        print(f"   Buying Power: ${float(account.buying_power):,.2f}")
        
        # Calculate growth goal progress (3x in 30 days)
        # Note: This is a simplified version - in production, track initial value
        daily_target = (GROWTH_TARGET ** (1/TARGET_DAYS)) - 1
        print(f"\n🎯 Growth Goal: {GROWTH_TARGET}x in {TARGET_DAYS} days")
        print(f"   Daily Target Return: {daily_target*100:.2f}%")
        print(f"   Strategy: Aggressive position sizing ({POSITION_SIZE_PERCENT*100:.0f}% of buying power per trade)")
    except Exception as e:
        print(f"⚠️  Could not fetch account info: {e}")

    # Save to CSV
    timestamp = datetime.now()
    log_entry = pd.DataFrame(
        [
            {
                "Timestamp": timestamp,
                "Signal": latest_signal,
                "Close": latest_close,
                "RSI": latest_rsi,
                "MACD": latest_macd,
                "MACD_Signal": latest_macd_signal,
            }
        ]
    )

    if not os.path.exists(CSV_FILE):
        log_entry.to_csv(CSV_FILE, index=False)
    else:
        log_entry.to_csv(CSV_FILE, mode="a", header=False, index=False)

    print("\n✅ Strategy execution completed")
    print(f"{'='*60}\n")


def main():
    """Main function"""
    # Initialize Alpaca
    if not initialize_alpaca():
        print("\n❌ Failed to initialize Alpaca.")
        print("\nTo get started:")
        print("1. Sign up at https://alpaca.markets")
        print("2. Get your API keys from the dashboard")
        print("3. Update ALPACA_API_KEY and ALPACA_SECRET_KEY in this script")
        return

    # Run strategy once immediately for testing
    print("\n🚀 Running initial strategy check...")
    run_strategy()

    # Schedule to run every weekday at 08:30 AM
    schedule.every().monday.at("08:30").do(run_strategy)
    schedule.every().tuesday.at("08:30").do(run_strategy)
    schedule.every().wednesday.at("08:30").do(run_strategy)
    schedule.every().thursday.at("08:30").do(run_strategy)
    schedule.every().friday.at("08:30").do(run_strategy)

    print("\n📅 Scheduler started. Strategy will run every weekday at 08:30 AM")
    print("Press Ctrl+C to stop\n")

    try:
        while True:
            schedule.run_pending()
            time.sleep(60)
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down gracefully...")
        print("✅ Scheduler stopped")


if __name__ == "__main__":
    main()
