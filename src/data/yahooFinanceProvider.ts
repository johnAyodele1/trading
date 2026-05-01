import axios from 'axios';
import { OHLCV } from '../types';

export interface DataProvider {
  loadData(target: string): Promise<OHLCV[]>;
}

export class YahooFinanceProvider implements DataProvider {
  async loadData(symbol: string, days: number = 60): Promise<OHLCV[]> {
    try {
      const baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/';
      const period1 = Math.floor((Date.now() - days * 24 * 3600000) / 1000);
      const period2 = Math.floor(Date.now() / 1000);

      const url = `${baseUrl}${symbol}?period1=${period1}&period2=${period2}&interval=1h&events=history`;

      const response = await axios.get(url);
      const result = response.data.chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];

      if (!timestamps) return [];

      return timestamps.map((ts: number, i: number) => ({
        timestamp: ts * 1000,
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i] || 0
      })).filter((q: any) => q.open && q.high && q.low && q.close);
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, (error as Error).message);
      return [];
    }
  }

  // Multi-asset fetch for DXY (Dollar Index), Gold, and Bond Yields (10Y)
  async loadMultiAssetContext(): Promise<Record<string, OHLCV[]>> {
    const assets = {
      dxy: 'DX-Y.NYB',
      gold: 'GC=F',
      tnx: '^TNX' // 10Y Bond Yield
    };

    const results: Record<string, OHLCV[]> = {};
    for (const [key, sym] of Object.entries(assets)) {
      results[key] = await this.loadData(sym);
    }
    return results;
  }
}
