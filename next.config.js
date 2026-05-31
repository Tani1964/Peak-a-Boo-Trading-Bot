/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only expose non-sensitive, client-safe vars here.
  // Server-only vars (MONGODB_URI, ALPACA_*) are read directly via process.env in route handlers.
  env: {
    TEST_MARKET_CLOSED: process.env.TEST_MARKET_CLOSED,
    TEST_BYPASS_MARKET_HOURS: process.env.TEST_BYPASS_MARKET_HOURS,
  },
}

module.exports = nextConfig
