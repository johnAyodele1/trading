import { OHLCV } from '../types';
import * as fs from 'fs';

export interface DataProvider {
  loadData(target: string): Promise<OHLCV[]>;
}

export class CSVLoader implements DataProvider {
  async loadData(filePath: string): Promise<OHLCV[]> {
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filePath} not found, generating mock data for demo.`);
      return this.generateMockData(1000);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].toLowerCase();

    return lines.slice(1).map(line => {
      const parts = line.split(',');
      return {
        timestamp: Number(parts[0]),
        open: Number(parts[1]),
        high: Number(parts[2]),
        low: Number(parts[3]),
        close: Number(parts[4]),
        volume: Number(parts[5])
      };
    });
  }

  private generateMockData(count: number): OHLCV[] {
    const candles: OHLCV[] = [];
    let price = 1.0850;
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.49) * 0.0015;
      const open = price;
      const close = price + change;
      candles.push({
        timestamp: Date.now() - (count - i) * 3600000,
        open, high: Math.max(open, close) + 0.0004, low: Math.min(open, close) - 0.0004, close, volume: 100
      });
      price = close;
    }
    return candles;
  }
}
