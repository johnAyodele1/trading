import axios from 'axios';
import { OHLCV } from '../types';
import { DataProvider } from './csvLoader';

export class BinanceProvider implements DataProvider {
  private baseUrl = 'https://api.binance.com/api/v3';

  async loadData(symbol: string = 'EURUSDT'): Promise<OHLCV[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/klines`, {
        params: {
          symbol: symbol.toUpperCase(),
          interval: '1h',
          limit: 500
        }
      });

      return response.data.map((k: any) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));
    } catch (error) {
      console.error('Error fetching data from Binance:', error);
      throw error;
    }
  }
}
