import yfinance as yf
import pandas_ta as ta
from datetime import datetime
import numpy as np

my_nan = np.nan
import schedule
import time
import os
from ib_insync import *

ib = IB()
ib.connect("127.0.0.1", 7497, clientId=1)  # 7497 is default for paper


# Optional: Use broker API library like ib_insync for live trading
from ib_insync import *

# IBKR Example Setup (commented)
ib = IB()
ib.connect("127.0.0.1", 7497, clientId=1)
import numpy as np

my_nan = np.nan
from ib_insync import *

ib = IB()
ib.connect("127.0.0.1", 7497, clientId=1)  # 7497 is default for paper


# Optional: Use broker API library like ib_insync for live trading
from ib_insync import *

# IBKR Example Setup (commented)
ib = IB()
ib.connect("127.0.0.1", 7497, clientId=1)

# Configurable Parameters
TICKER = "ES=F"  # S&P 500 E-mini futures (Yahoo symbol)
RSI_PERIOD = 14
MACD_FAST = 12
MACD_SLOW = 26
MACD_SIGNAL = 9

CSV_FILE = "es_futures_signals.csv"


# Signal to order mapping (placeholder)
def place_order(signal):
    print(f"Placing order: {signal}")
    # Replace this with live broker code (IBKR, Alpaca, etc.)
    # Example for IBKR:
    # if signal == 'BUY':
    #     order = MarketOrder('BUY', 1)
    #     ib.placeOrder(contract, order)
    # elif signal == 'SELL':
    #     order = MarketOrder('SELL', 1)
    #     ib.placeOrder(contract, order)


# Main strategy function
def run_strategy():
    print(f"Running strategy at {datetime.now()}")
    data = yf.download(
        TICKER,
        start="2023-06-01",
        end=datetime.today().strftime("%Y-%m-%d"),
        interval="1d",
    )

    # Calculate indicators using pandas_ta
    data["RSI"] = ta.rsi(data["Close"], length=RSI_PERIOD)
    macd = ta.macd(data["Close"], fast=MACD_FAST, slow=MACD_SLOW, signal=MACD_SIGNAL)
    data["MACD"] = macd["MACD_12_26_9"]
    data["MACD_Signal"] = macd["MACDs_12_26_9"]

    def generate_signal(row):
        if row["RSI"] < 30 and row["MACD"] > row["MACD_Signal"]:
            return "BUY"
        elif row["RSI"] > 70 and row["MACD"] < row["MACD_Signal"]:
            return "SELL"
        else:
            return "HOLD"

    data["Signal"] = data.apply(generate_signal, axis=1)
    latest_signal = data.iloc[-1]["Signal"]
    print(f"Latest Signal: {latest_signal}")
    place_order(latest_signal)

    # Save to CSV (append mode)
    if not os.path.exists(CSV_FILE):
        data.to_csv(CSV_FILE)
    else:
        data.tail(1).to_csv(CSV_FILE, mode="a", header=False)


# Schedule to run every weekday at 08:30 AM
schedule.every().monday.at("08:30").do(run_strategy)
schedule.every().tuesday.at("08:30").do(run_strategy)
schedule.every().wednesday.at("08:30").do(run_strategy)
schedule.every().thursday.at("08:30").do(run_strategy)
schedule.every().friday.at("08:30").do(run_strategy)

print("Scheduler started. Waiting for next trading session...")
while True:
    schedule.run_pending()
    time.sleep(60)

# Configurable Parameters
TICKER = "ES=F"  # S&P 500 E-mini futures (Yahoo symbol)
RSI_PERIOD = 14
MACD_FAST = 12
MACD_SLOW = 26
MACD_SIGNAL = 9

CSV_FILE = "es_futures_signals.csv"


# Signal to order mapping (placeholder)
def place_order(signal):
    print(f"Placing order: {signal}")
    # Replace this with live broker code (IBKR, Alpaca, etc.)
    # Example for IBKR:
    # if signal == 'BUY':
    #     order = MarketOrder('BUY', 1)
    #     ib.placeOrder(contract, order)
    # elif signal == 'SELL':
    #     order = MarketOrder('SELL', 1)
    #     ib.placeOrder(contract, order)


# Main strategy function
def run_strategy():
    print(f"Running strategy at {datetime.now()}")
    data = yf.download(
        TICKER,
        start="2023-06-01",
        end=datetime.today().strftime("%Y-%m-%d"),
        interval="1d",
    )

    # Calculate indicators using pandas_ta
    data["RSI"] = ta.rsi(data["Close"], length=RSI_PERIOD)
    macd = ta.macd(data["Close"], fast=MACD_FAST, slow=MACD_SLOW, signal=MACD_SIGNAL)
    data["MACD"] = macd["MACD_12_26_9"]
    data["MACD_Signal"] = macd["MACDs_12_26_9"]

    def generate_signal(row):
        if row["RSI"] < 30 and row["MACD"] > row["MACD_Signal"]:
            return "BUY"
        elif row["RSI"] > 70 and row["MACD"] < row["MACD_Signal"]:
            return "SELL"
        else:
            return "HOLD"

    data["Signal"] = data.apply(generate_signal, axis=1)
    latest_signal = data.iloc[-1]["Signal"]
    print(f"Latest Signal: {latest_signal}")
    place_order(latest_signal)

    # Save to CSV (append mode)
    if not os.path.exists(CSV_FILE):
        data.to_csv(CSV_FILE)
    else:
        data.tail(1).to_csv(CSV_FILE, mode="a", header=False)


# Schedule to run every weekday at 08:30 AM
schedule.every().monday.at("08:30").do(run_strategy)
schedule.every().tuesday.at("08:30").do(run_strategy)
schedule.every().wednesday.at("08:30").do(run_strategy)
schedule.every().thursday.at("08:30").do(run_strategy)
schedule.every().friday.at("08:30").do(run_strategy)

print("Scheduler started. Waiting for next trading session...")
while True:
    schedule.run_pending()
    time.sleep(60)
