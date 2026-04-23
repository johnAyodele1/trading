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
    const ema50 = Indicators.ema(closes, 50);
    const atr = Indicators.atr(candles, 14);

    const currentPrice = closes[closes.length - 1];
    const avgAtr = atr.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentAtr = atr[atr.length - 1];

    // Slope analysis
    const slope = Indicators.emaSlope(ema50, 5);
    const normalizedSlope = Math.abs(slope / currentPrice) * 10000;

    // Calculate raw scores for each regime
    let trendScore = Math.min(normalizedSlope / 0.8, 1.0);
    let rangeScore = 1.0 - Math.min(normalizedSlope / 0.4, 1.0);
    let lowVolScore = currentAtr < avgAtr ? (avgAtr - currentAtr) / avgAtr : 0;

    // Softmax-like normalization
    const total = trendScore + rangeScore + lowVolScore;
    const probabilities = {
      TREND: trendScore / total,
      RANGE: rangeScore / total,
      LOW_VOLATILITY: lowVolScore / total
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
