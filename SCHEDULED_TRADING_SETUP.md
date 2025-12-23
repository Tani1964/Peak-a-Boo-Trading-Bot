# Scheduled Trading Setup Guide

This guide explains how to set up automated scheduled trading using external services.

## 🎯 Overview

Your Next.js app has API endpoints that can be called on a schedule to automatically:
1. Analyze market conditions (RSI, MACD indicators)
2. Generate trading signals (BUY, SELL, HOLD)
3. Execute trades automatically (if enabled)

## 📋 Prerequisites

1. Your Next.js app deployed (Vercel, Netlify, etc.)
2. Environment variables configured on your hosting platform
3. GitHub account (for GitHub Actions option)

## 🔧 Option 1: GitHub Actions (Recommended - Free)

### Step 1: Set Up API Secret

1. Generate a secure secret token (you can use any random string):
   ```bash
   openssl rand -hex 32
   ```

2. Add it to your `.env` file (local) and your hosting platform's environment variables:
   ```
   AUTO_TRADE_SECRET=your-generated-secret-here
   ```

3. **In GitHub**:
   - Go to your repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `AUTO_TRADE_SECRET`
   - Value: (paste your secret)

4. **Add GitHub Secret for App URL** (optional but recommended):
   - Create another secret: `APP_URL`
   - Value: `https://your-app.vercel.app` (your deployed URL)

### Step 2: Update the Workflow File

1. Update `.github/workflows/auto-trade.yml`:
   - Change the `APP_URL` in the workflow file to your actual deployed URL
   - Or set it as a GitHub secret (recommended) and update the workflow to use `${{ secrets.APP_URL }}`

2. Adjust the schedule if needed:
   - Current: `30 13 * * 1-5` (Mon-Fri at 13:30 UTC = 9:30 AM EDT)
   - Use [crontab.guru](https://crontab.guru/) to customize

### Step 3: Commit and Push

```bash
git add .github/workflows/auto-trade.yml
git commit -m "Add scheduled trading workflow"
git push
```

### Step 4: Test Manually

1. Go to GitHub → Your repo → Actions tab
2. Click "Auto Trade" workflow
3. Click "Run workflow" → "Run workflow"
4. Check the logs to see if it works

## 🌐 Option 2: External Cron Service (cron-job.org)

### Step 1: Sign Up
1. Go to [cron-job.org](https://cron-job.org/) (free account available)
2. Create an account

### Step 2: Create a Cron Job
1. Click "Create cronjob"
2. **Title**: "Auto Trade"
3. **Address**: `https://your-app.vercel.app/api/strategy/auto`
4. **Request method**: POST
5. **Request body** (JSON):
   ```json
   {
     "symbol": "SPY",
     "autoExecute": true
   }
   ```
6. **Headers**:
   - `Content-Type: application/json`
   - `x-api-secret: your-generated-secret-here`
7. **Schedule**: Every weekday at 9:30 AM (your timezone)
8. **Activation**: Enabled

### Step 3: Test
Click "Test execution" to verify it works

## 🔐 Option 3: Vercel Cron Jobs (If using Vercel)

1. Create `vercel.json` in your project root:
```json
{
  "crons": [{
    "path": "/api/strategy/auto",
    "schedule": "30 13 * * 1-5"
  }]
}
```

2. The cron job will automatically call your API endpoint
3. Note: Vercel cron jobs are only available on paid plans

## 📊 API Endpoint Details

### Endpoint: `POST /api/strategy/auto`

**Headers:**
- `Content-Type: application/json`
- `x-api-secret: YOUR_SECRET` (required if `AUTO_TRADE_SECRET` env var is set)

**Body:**
```json
{
  "symbol": "SPY",          // Optional, defaults to "SPY"
  "autoExecute": true       // Optional, defaults to true
}
```

**Response:**
```json
{
  "success": true,
  "signal": {
    "id": "...",
    "symbol": "SPY",
    "signal": "BUY",
    "closePrice": 450.25,
    "indicators": { ... }
  },
  "executed": true,
  "order": { ... }
}
```

## ⚠️ Important Notes

1. **Market Hours**: The endpoint checks if the market is open. If closed, it returns `skipped: true`
2. **HOLD Signals**: If the signal is HOLD, no trade is executed
3. **Security**: Always use the `AUTO_TRADE_SECRET` to protect your endpoint
4. **Testing**: Test with paper trading first! Never use real money without thorough testing
5. **Rate Limits**: Be aware of API rate limits (Alpaca, Yahoo Finance)

## 🧪 Testing Locally

You can test the endpoint locally:

```bash
curl -X POST http://localhost:3000/api/strategy/auto \
  -H "Content-Type: application/json" \
  -H "x-api-secret: your-secret" \
  -d '{"symbol": "SPY", "autoExecute": false}'
```

Set `autoExecute: false` during testing to avoid executing real trades!

## 📝 Customization

- **Symbol**: Change `"symbol": "SPY"` to trade different stocks
- **Schedule**: Modify cron schedule for different times
- **Position Size**: Edit `POSITION_SIZE` in `/app/api/strategy/auto/route.ts`

## 🐛 Troubleshooting

- **401 Unauthorized**: Check that `AUTO_TRADE_SECRET` matches in both places
- **Market Closed**: This is expected outside trading hours
- **No trades executed**: Check if signal was HOLD or if already holding position
- **GitHub Actions not running**: Check that workflow file is in `.github/workflows/` and pushed to main branch

