# 📊 Peak-a-Boo Trading Bot - Next.js Edition

A modern, serverless trading bot built with Next.js, TypeScript, and MongoDB. This application uses RSI and MACD technical indicators to generate trading signals and execute trades via the Alpaca API.

## 🚀 Features

- **Serverless Architecture**: Built with Next.js API routes for scalable, serverless deployment
- **Real-time Trading**: Integrates with Alpaca API for paper and live trading
- **Technical Analysis**: Uses RSI and MACD indicators for signal generation
- **MongoDB Storage**: Persists trading signals, orders, and account snapshots
- **Interactive Dashboard**: Beautiful UI to monitor account status, positions, and trading history
- **TypeScript**: Fully typed for better development experience

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: MongoDB with Mongoose ODM
- **Trading API**: Alpaca Markets
- **Market Data**: Yahoo Finance API
- **Technical Indicators**: technicalindicators library
- **State Management**: SWR for data fetching

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB (local or MongoDB Atlas)
- Alpaca Markets account (free paper trading account)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   cd /home/tani/Documents/work/gigs/peak-a-boo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your credentials:
   ```env
   MONGODB_URI=mongodb://localhost:27017/peak-a-boo-trading
   ALPACA_API_KEY=your_alpaca_api_key
   ALPACA_SECRET_KEY=your_alpaca_secret_key
   ALPACA_BASE_URL=https://paper-api.alpaca.markets
   ```

4. **Get Alpaca API credentials**
   - Sign up at [Alpaca Markets](https://alpaca.markets)
   - Navigate to Paper Trading Dashboard
   - Copy your API Key and Secret Key

5. **Start MongoDB**
   ```bash
   # If running locally
   mongod
   
   # Or use MongoDB Atlas (cloud)
   # Update MONGODB_URI in .env with your Atlas connection string
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── app/
│   ├── api/               # API routes (serverless functions)
│   │   ├── account/       # Account information
│   │   ├── positions/     # Current positions
│   │   ├── market/        # Market status
│   │   ├── strategy/      # Strategy analysis & execution
│   │   └── trades/        # Trade history
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── AccountInfo.tsx
│   ├── Dashboard.tsx
│   ├── Header.tsx
│   ├── MarketStatus.tsx
│   ├── Positions.tsx
│   ├── SignalHistory.tsx
│   ├── StrategyControl.tsx
│   └── TradeHistory.tsx
├── lib/                   # Utility libraries
│   ├── alpaca.ts         # Alpaca API client
│   ├── indicators.ts     # Technical indicators
│   ├── mongodb.ts        # Database connection
│   └── yahoo-finance.ts  # Market data fetching
├── models/               # MongoDB schemas
│   ├── AccountSnapshot.ts
│   ├── Signal.ts
│   └── Trade.ts
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.js
```

## 🎯 How It Works

### Trading Strategy

The bot uses a combination of RSI and MACD indicators:

- **BUY Signal**: RSI < 30 (oversold) AND MACD > MACD Signal (bullish crossover)
- **SELL Signal**: RSI > 70 (overbought) AND MACD < MACD Signal (bearish crossover)
- **HOLD**: All other conditions

### Workflow

1. **Analyze**: Click "Analyze Strategy" to fetch market data and calculate indicators
2. **Review**: Check the generated signal and technical indicators
3. **Execute**: Click "Execute" to place the order with Alpaca
4. **Monitor**: View positions, signals, and trade history in real-time

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/account` | GET | Get account information |
| `/api/positions` | GET | Get current positions |
| `/api/market/status` | GET | Check if market is open |
| `/api/strategy/analyze` | POST | Analyze and generate signal |
| `/api/strategy/analyze` | GET | Get signal history |
| `/api/strategy/execute` | POST | Execute trading order |
| `/api/trades` | GET | Get trade history |

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

You can deploy to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

## 📊 MongoDB Collections

- **signals**: Trading signals with indicators
- **trades**: Executed orders and their status
- **accountsnapshots**: Historical account data

## ⚠️ Important Notes

- **Paper Trading**: This project is configured for paper trading by default. Never use real money without thorough testing!
- **Risk Warning**: Trading involves risk. This bot is for educational purposes only.
- **API Limits**: Be aware of Alpaca API rate limits
- **Market Hours**: The bot checks if the market is open before executing trades

## 🔐 Security

- Never commit `.env` files to version control
- Keep your Alpaca API keys secure
- Use environment variables for all sensitive data
- Consider implementing authentication for production deployments

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string format
- Verify network access (for Atlas)

### Alpaca API Errors
- Verify API credentials
- Check market hours
- Ensure sufficient buying power

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version`

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Support

For issues or questions, please open a GitHub issue.

---

**Disclaimer**: This software is for educational purposes only. Use at your own risk. The authors are not responsible for any financial losses incurred through the use of this software.
