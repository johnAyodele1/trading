import axios from 'axios';
import { OHLCV } from '../types';
import { DataProvider } from './csvLoader';

export class YahooFinanceProvider implements DataProvider {
  async loadData(symbol: string = 'EURUSD=X'): Promise<OHLCV[]> {
    try {
      const baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/';
      // Increased to 60 days for 2000+ hourly candles
      const period1 = Math.floor((Date.now() - 60 * 24 * 3600000) / 1000);
      const period2 = Math.floor(Date.now() / 1000);

      const url = `${baseUrl}${symbol}?period1=${period1}&period2=${period2}&interval=1h&events=history`;

      const response = await axios.get(url);

      const result = response.data.chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];

      if (!timestamps) {
        console.error(`No data returned for ${symbol}`);
        return [];
      }

      return timestamps.map((ts: number, i: number) => ({
        timestamp: ts * 1000,
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i] || 0
      })).filter((q: any) => q.open && q.high && q.low && q.close);
    } catch (error) {
      console.error(`Error fetching from Yahoo Finance API for ${symbol}:`, (error as Error).message);
      return [];
    }
  }
}
