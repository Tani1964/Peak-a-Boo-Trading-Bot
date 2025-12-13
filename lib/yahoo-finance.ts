import axios from 'axios';

export interface YahooFinanceData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export async function fetchHistoricalData(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<YahooFinanceData[]> {
  try {
    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await axios.get(url);
    const result = response.data.chart.result[0];

    if (!result) {
      throw new Error('No data returned from Yahoo Finance');
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes.close;

    const data: YahooFinanceData[] = timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000),
      open: quotes.open[index],
      high: quotes.high[index],
      low: quotes.low[index],
      close: quotes.close[index],
      volume: quotes.volume[index],
      adjClose: adjClose[index] || quotes.close[index],
    }));

    return data.filter((d) => d.close !== null);
  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error);
    throw error;
  }
}

export async function fetchCurrentPrice(symbol: string): Promise<number> {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const data = await fetchHistoricalData(symbol, startDate, endDate);
    
    if (data.length === 0) {
      throw new Error('No price data available');
    }

    return data[data.length - 1].close;
  } catch (error) {
    console.error('Error fetching current price:', error);
    throw error;
  }
}
