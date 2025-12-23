/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    ALPACA_API_KEY: process.env.ALPACA_API_KEY,
    ALPACA_SECRET_KEY: process.env.ALPACA_SECRET_KEY,
    ALPACA_BASE_URL: process.env.ALPACA_BASE_URL,
    TEST_MARKET_CLOSED: process.env.TEST_MARKET_CLOSED,
    TEST_BYPASS_MARKET_HOURS: process.env.TEST_BYPASS_MARKET_HOURS,
  },
}

module.exports = nextConfig
