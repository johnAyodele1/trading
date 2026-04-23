import { OHLCV } from '../types';
import { Indicators } from './indicators';

export interface MarketFeatures {
  trendStrength: number; // EMA slope normalized
  momentum: number;      // RSI
  volatility: number;    // ATR relative to price
  priceChange: number;   // Percentage change over lookback
  liquidityZoneDist: number; // Distance to nearest high/low
  isLondonSession: boolean;
  isNYSession: boolean;
}

export class FeatureExtractor {
  static extract(candles: OHLCV[]): MarketFeatures {
    const closes = candles.map(c => c.close);
    const ema20 = Indicators.ema(closes, 20);
    const rsi14 = Indicators.rsi(closes, 14);
    const atr14 = Indicators.atr(candles, 14);

    const currentPrice = closes[closes.length - 1];
    const slope = Indicators.emaSlope(ema20, 5);
    const trendStrength = slope / currentPrice * 1000; // Normalized slope

    const momentum = rsi14[rsi14.length - 1];
    const volatility = (atr14[atr14.length - 1] / currentPrice) * 100;

    const lookback = 10;
    const priceChange = ((currentPrice - closes[closes.length - lookback]) / closes[closes.length - lookback]) * 100;

    const recentHigh = Math.max(...candles.slice(-20).map(c => c.high));
    const recentLow = Math.min(...candles.slice(-20).map(c => c.low));
    const distToHigh = (recentHigh - currentPrice) / currentPrice;
    const distToLow = (currentPrice - recentLow) / currentPrice;
    const liquidityZoneDist = Math.min(distToHigh, distToLow) * 100;

    const date = new Date(candles[candles.length - 1].timestamp);
    const hour = date.getUTCHours();

    // London: 08:00 - 16:00 UTC
    // NY: 13:00 - 21:00 UTC
    const isLondonSession = hour >= 8 && hour < 16;
    const isNYSession = hour >= 13 && hour < 21;

    return {
      trendStrength,
      momentum,
      volatility,
      priceChange,
      liquidityZoneDist,
      isLondonSession,
      isNYSession
    };
  }
}
