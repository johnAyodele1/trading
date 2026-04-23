import { OHLCV, MarketRegime, MarketRegimeType } from '../types';
import { Indicators } from './indicators';

export class RegimeDetection {
  static detect(candles: OHLCV[]): MarketRegime {
    if (candles.length < 50) {
      return {
        primary: 'LOW_VOLATILITY',
        probabilities: { TREND: 0.1, RANGE: 0.1, LOW_VOLATILITY: 0.8 }
      };
    }

    const closes = candles.map(c => c.close);
    const ema20 = Indicators.ema(closes, 20);
    const ema50 = Indicators.ema(closes, 50);
    const atr = Indicators.atr(candles, 14);

    const currentPrice = closes[closes.length - 1];
    const avgAtr = atr.slice(-50).reduce((a, b) => a + b, 0) / Math.max(atr.slice(-50).length, 1);
    const currentAtr = atr[atr.length - 1];

    // Slope analysis (Short-term vs Mid-term)
    const slopeShort = Indicators.emaSlope(ema20, 3);
    const slopeMid = Indicators.emaSlope(ema50, 5);

    const normSlopeShort = Math.abs(slopeShort / currentPrice) * 10000;
    const normSlopeMid = Math.abs(slopeMid / currentPrice) * 10000;

    // Signal-to-noise: Normalized ATR relative to its average
    const volRelative = currentAtr / (avgAtr || 1);

    // Probabilistic Scoring
    let trendScore = (normSlopeMid * 0.7 + normSlopeShort * 0.3) / 0.6;
    let rangeScore = 1.0 - (normSlopeMid / 0.3);
    let lowVolScore = volRelative < 0.8 ? (0.8 - volRelative) / 0.8 : 0;

    // Guards and Smoothing
    trendScore = Math.max(0, Math.min(trendScore, 1.5));
    rangeScore = Math.max(0, Math.min(rangeScore, 1.5));
    lowVolScore = Math.max(0, Math.min(lowVolScore, 1.5));

    // Softmax normalization
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
