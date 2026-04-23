import { OHLCV, MarketRegime } from '../types';
import { Indicators } from './indicators';
import { RegimeDetection } from './regimeDetection';

export interface MarketFeatures {
  trendStrength: number;
  momentum: number;
  volatility: number;
  priceChange: number;
  liquidityZoneDist: number;
  isLondonSession: boolean;
  isNYSession: boolean;
  regime: MarketRegime;
}

export class FeatureExtractor {
  static extractAll(candles: OHLCV[]): MarketFeatures[] {
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

      const slope = i >= 5 ? (ema20[i] - ema20[i-5]) / 5 : 0;
      const trendStrength = slope / currentPrice * 1000;

      const momentum = rsi14[i];
      const volatility = (atr14[i] / currentPrice) * 100;

      const lookback = 10;
      const prevPrice = i >= lookback ? closes[i - lookback] : closes[0];
      const priceChange = ((currentPrice - prevPrice) / prevPrice) * 100;

      const start = Math.max(0, i - 20);
      const recentHigh = Math.max(...highs.slice(start, i + 1));
      const recentLow = Math.min(...lows.slice(start, i + 1));
      const distToHigh = (recentHigh - currentPrice) / currentPrice;
      const distToLow = (currentPrice - recentLow) / currentPrice;
      const liquidityZoneDist = Math.min(distToHigh, distToLow) * 100;

      const date = new Date(candle.timestamp);
      const hour = date.getUTCHours();
      const isLondonSession = hour >= 8 && hour < 16;
      const isNYSession = hour >= 13 && hour < 21;

      // O(1) inside map because it uses pre-computed EMAs/ATRs and O(50) window max
      const regime = RegimeDetection.detect(candles, i, preComputed);

      return {
        trendStrength,
        momentum,
        volatility,
        priceChange,
        liquidityZoneDist,
        isLondonSession,
        isNYSession,
        regime
      };
    });
  }
}
