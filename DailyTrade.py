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
POSITION_SIZE = 1  # Number of shares

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


def place_order(signal, symbol):
    """Place order based on signal"""
    if api is None:
        print("❌ Alpaca API not initialized")
        return False

    try:
        # Check current positions
        try:
            position = api.get_position(symbol)
            current_qty = int(position.qty)
        except:
            current_qty = 0

        if signal == "BUY":
            if current_qty <= 0:
                # Close any short position first
                if current_qty < 0:
                    close_all_positions(symbol)

                # Place buy order
                order = api.submit_order(
                    symbol=symbol,
                    qty=POSITION_SIZE,
                    side="buy",
                    type="market",
                    time_in_force="day",
                )
                print(f"✅ BUY order placed: {POSITION_SIZE} shares of {symbol}")
                return True
            else:
                print(f"📊 Already holding {current_qty} shares of {symbol}")
                return True

        elif signal == "SELL":
            if current_qty > 0:
                # Close long position
                close_all_positions(symbol)

                # Place sell (short) order
                order = api.submit_order(
                    symbol=symbol,
                    qty=POSITION_SIZE,
                    side="sell",
                    type="market",
                    time_in_force="day",
                )
                print(f"✅ SELL order placed: {POSITION_SIZE} shares of {symbol}")
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

    # Generate signal
    def generate_signal(row):
        if row["RSI"] < 30 and row["MACD"] > row["MACD_Signal"]:
            return "BUY"
        elif row["RSI"] > 70 and row["MACD"] < row["MACD_Signal"]:
            return "SELL"
        else:
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

    # Get current account status
    try:
        account = api.get_account()
        print("\n💼 Account Status:")
        print(f"   Portfolio Value: ${float(account.portfolio_value):,.2f}")
        print(f"   Cash: ${float(account.cash):,.2f}")
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
