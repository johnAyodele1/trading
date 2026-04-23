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
  // O(n) pre-calculation of features
  static extractAll(candles: OHLCV[]): MarketFeatures[] {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const ema20 = Indicators.ema(closes, 20);
    const ema50 = Indicators.ema(closes, 50);
    const rsi14 = Indicators.rsi(closes, 14);
    const atr14 = Indicators.atr(candles, 14);

    return candles.map((candle, i) => {
      const currentPrice = candle.close;

      // Trend strength
      const emaWindow = ema20.slice(0, i + 1);
      const slope = Indicators.emaSlope(emaWindow, 5);
      const trendStrength = slope / currentPrice * 1000;

      // Momentum and Volatility
      const momentum = rsi14[i];
      const volatility = (atr14[i] / currentPrice) * 100;

      // Price Change
      const lookback = 10;
      const prevPrice = i >= lookback ? closes[i - lookback] : closes[0];
      const priceChange = ((currentPrice - prevPrice) / prevPrice) * 100;

      // Liquidity
      const start = Math.max(0, i - 20);
      const recentHigh = Math.max(...highs.slice(start, i + 1));
      const recentLow = Math.min(...lows.slice(start, i + 1));
      const distToHigh = (recentHigh - currentPrice) / currentPrice;
      const distToLow = (currentPrice - recentLow) / currentPrice;
      const liquidityZoneDist = Math.min(distToHigh, distToLow) * 100;

      // Session
      const date = new Date(candle.timestamp);
      const hour = date.getUTCHours();
      const isLondonSession = hour >= 8 && hour < 16;
      const isNYSession = hour >= 13 && hour < 21;

      // Regime (Calculated iteratively to avoid full re-run)
      const regime = RegimeDetection.detect(candles.slice(0, i + 1));

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
