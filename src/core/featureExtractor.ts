import { OHLCV, MarketRegime } from '../types';
import { Indicators } from './indicators';
import { RegimeDetection } from './regimeDetection';

export interface MarketFeatures {
  trendStrength: number;
  momentum: number;
  volatility: number;
  liquidityZoneDist: number;
  isLondonSession: boolean;
  isNYSession: boolean;
  regime: MarketRegime;
  // Cross-asset signals
  dxyCorrelation: number;
  goldCorrelation: number;
  yieldTrend: number;
  // Session Patterns
  londonOpenBias: number;
}

export class FeatureExtractor {
  static extractAll(candles: OHLCV[], context?: Record<string, OHLCV[]>): MarketFeatures[] {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const ema20 = Indicators.ema(closes, 20);
    const ema50 = Indicators.ema(closes, 50);
    const rsi14 = Indicators.rsi(closes, 14);
    const atr14 = Indicators.atr(candles, 14);

    const preComputed = { ema20, ema50, atr14 };

    return candles.map((candle, i) => {
      const currentPrice = candle.close;
      const date = new Date(candle.timestamp);
      const hour = date.getUTCHours();

      const slope = i >= 5 ? (ema20[i] - ema20[i-5]) / 5 : 0;
      const trendStrength = slope / currentPrice * 1000;

      // Session flags
      const isLondonSession = hour >= 8 && hour < 16;
      const isNYSession = hour >= 13 && hour < 21;

      // CROSS-ASSET CORRELATION (Simplistic 24h rolling window)
      let dxyCorrelation = 0;
      if (context?.dxy) {
        const dxyWindow = context.dxy.filter(c => c.timestamp <= candle.timestamp).slice(-24);
        const candleWindow = candles.slice(0, i + 1).slice(-24);
        if (dxyWindow.length === candleWindow.length && dxyWindow.length > 10) {
          dxyCorrelation = this.calculateCorrelation(candleWindow.map(c => c.close), dxyWindow.map(c => c.close));
        }
      }

      // LONDON OPEN BIAS (8:00 UTC)
      let londonOpenBias = 0;
      if (hour === 8) {
        const prevClose = closes[Math.max(0, i-1)];
        londonOpenBias = (currentPrice - prevClose) / prevClose * 100;
      }

      const regime = RegimeDetection.detect(candles, i, preComputed);

      return {
        trendStrength,
        momentum: rsi14[i],
        volatility: (atr14[i] / currentPrice) * 100,
        liquidityZoneDist: this.calcLiquidity(highs, lows, currentPrice, i),
        isLondonSession,
        isNYSession,
        regime,
        dxyCorrelation,
        goldCorrelation: 0, // Placeholder for future expansion
        yieldTrend: 0,      // Placeholder for future expansion
        londonOpenBias
      };
    });
  }

  private static calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return den === 0 ? 0 : num / den;
  }

  private static calcLiquidity(highs: number[], lows: number[], price: number, i: number): number {
    const start = Math.max(0, i - 20);
    const recentHigh = Math.max(...highs.slice(start, i + 1));
    const recentLow = Math.min(...lows.slice(start, i + 1));
    return Math.min((recentHigh - price) / price, (price - recentLow) / price) * 100;
  }
}
