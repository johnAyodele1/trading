import { OHLCV, MarketRegime } from '../types';
import { Indicators } from './indicators';

export class RegimeDetection {
  static detect(candles: OHLCV[]): MarketRegime {
    if (candles.length < 50) return 'LOW_VOLATILITY';

    const closes = candles.map(c => c.close);
    const ema50 = Indicators.ema(closes, 50);
    const atr = Indicators.atr(candles, 14);

    const currentPrice = closes[closes.length - 1];
    const avgAtr = atr.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentAtr = atr[atr.length - 1];

    // Low Volatility Check
    if (currentAtr < avgAtr * 0.7) {
      return 'LOW_VOLATILITY';
    }

    // Slope analysis for Trend
    const slope = Indicators.emaSlope(ema50, 5);
    const normalizedSlope = Math.abs(slope / currentPrice) * 10000;

    // Structure Analysis
    const isHigherHigh = candles[candles.length - 1].high > candles[candles.length - 2].high;
    const isLowerLow = candles[candles.length - 1].low < candles[candles.length - 2].low;

    if (normalizedSlope > 0.5) {
      return 'TREND';
    }

    if (normalizedSlope < 0.2 && !isHigherHigh && !isLowerLow) {
      return 'RANGE';
    }

    // Default to TREND if there is movement, or RANGE if price is choppy
    return normalizedSlope > 0.3 ? 'TREND' : 'RANGE';
  }
}
