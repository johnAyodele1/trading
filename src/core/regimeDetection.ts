import { OHLCV, MarketRegime, MarketRegimeType } from '../types';
import { Indicators } from './indicators';

export class RegimeDetection {
  static detect(
    candles: OHLCV[],
    index: number,
    preComputed: { ema20: number[], ema50: number[], atr14: number[] }
  ): MarketRegime {
    if (index < 50) {
      return {
        primary: 'LOW_VOLATILITY',
        probabilities: { TREND: 0.1, RANGE: 0.1, LOW_VOLATILITY: 0.8 }
      };
    }

    const currentPrice = candles[index].close;

    // Use pre-calculated average ATR for O(1) inside loop
    const startIdx = Math.max(0, index - 50);
    const windowAtr = preComputed.atr14.slice(startIdx, index + 1);
    const avgAtr = windowAtr.reduce((a, b) => a + b, 0) / Math.max(windowAtr.length, 1);
    const currentAtr = preComputed.atr14[index];

    // Slope analysis using pre-computed EMAs
    const slopeShort = (preComputed.ema20[index] - preComputed.ema20[index - 3]) / 3;
    const slopeMid = (preComputed.ema50[index] - preComputed.ema50[index - 5]) / 5;

    const normSlopeShort = Math.abs(slopeShort / currentPrice) * 10000;
    const normSlopeMid = Math.abs(slopeMid / currentPrice) * 10000;

    const volRelative = currentAtr / (avgAtr || 1);

    let trendScore = (normSlopeMid * 0.7 + normSlopeShort * 0.3) / 0.6;
    let rangeScore = 1.0 - (normSlopeMid / 0.3);
    let lowVolScore = volRelative < 0.8 ? (0.8 - volRelative) / 0.8 : 0;

    trendScore = Math.max(0, Math.min(trendScore, 1.5));
    rangeScore = Math.max(0, Math.min(rangeScore, 1.5));
    lowVolScore = Math.max(0, Math.min(lowVolScore, 1.5));

    const expT = Math.exp(trendScore);
    const expR = Math.exp(rangeScore);
    const expL = Math.exp(lowVolScore);
    const sum = expT + expR + expL;

    const probabilities = {
      TREND: expT / sum,
      RANGE: expR / sum,
      LOW_VOLATILITY: expL / sum
    };

    let primary: MarketRegimeType = 'RANGE';
    if (probabilities.TREND > probabilities.RANGE && probabilities.TREND > probabilities.LOW_VOLATILITY) {
      primary = 'TREND';
    } else if (probabilities.LOW_VOLATILITY > probabilities.TREND && probabilities.LOW_VOLATILITY > probabilities.RANGE) {
      primary = 'LOW_VOLATILITY';
    }

    return { primary, probabilities };
  }
}
