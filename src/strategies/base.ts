import { OHLCV, Bias, Signal } from '../types';
import { FeatureExtractor } from '../core/featureExtractor';
import { RegimeDetection } from '../core/regimeDetection';

export interface Strategy {
  name: string;
  generateSignal(data: { pair: string, candles: OHLCV[] }): Signal | null;
}

export class TrendFollowingStrategy implements Strategy {
  name = 'TrendFollowing';

  generateSignal(data: { pair: string, candles: OHLCV[] }): Signal | null {
    const candles = data.candles;
    const regime = RegimeDetection.detect(candles);

    // Probabilistic Ensemble: Only execute if TREND probability is dominant or significant
    if (regime.probabilities.TREND < 0.4) return null;

    const features = FeatureExtractor.extract(candles);
    const currentPrice = candles[candles.length - 1].close;

    if (features.volatility > 0.5 || features.volatility < 0.02) return null;

    const bias: Bias = features.trendStrength > 0 ? 'BUY' : 'SELL';
    if (bias === 'BUY' && (features.momentum > 65 || features.momentum < 50)) return null;
    if (bias === 'SELL' && (features.momentum < 35 || features.momentum > 50)) return null;

    const atr = features.volatility * currentPrice / 100;
    const stopLoss = bias === 'BUY' ? currentPrice - 1.5 * atr : currentPrice + 1.5 * atr;
    const takeProfit = bias === 'BUY' ? currentPrice + 3 * atr : currentPrice - 3 * atr;

    return {
      id: Math.random().toString(36).substring(7),
      strategyName: this.name,
      pair: data.pair,
      bias,
      entry: currentPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      risk_reward: 2.0,
      confidence_score: 0,
      historical_win_rate: 0,
      regime,
      confluences: ['Probabilistic Trend', 'Momentum'],
      reasoning: `Trend following ${bias} (P=${regime.probabilities.TREND.toFixed(2)})`,
      invalidation_reason: 'Trend exhaustion',
      timestamp: Date.now(),
      features: features as any
    };
  }
}

export class MeanReversionStrategy implements Strategy {
  name = 'MeanReversion';

  generateSignal(data: { pair: string, candles: OHLCV[] }): Signal | null {
    const candles = data.candles;
    const regime = RegimeDetection.detect(candles);

    if (regime.probabilities.RANGE < 0.4) return null;

    const features = FeatureExtractor.extract(candles);
    const currentPrice = candles[candles.length - 1].close;

    if (features.volatility > 0.3) return null;

    let bias: Bias | null = null;
    if (features.momentum < 30) bias = 'BUY';
    if (features.momentum > 70) bias = 'SELL';

    if (!bias) return null;

    const atr = features.volatility * currentPrice / 100;
    const stopLoss = bias === 'BUY' ? currentPrice - 1.2 * atr : currentPrice + 1.2 * atr;
    const takeProfit = bias === 'BUY' ? currentPrice + 2.4 * atr : currentPrice - 2.4 * atr;

    return {
      id: Math.random().toString(36).substring(7),
      strategyName: this.name,
      pair: data.pair,
      bias,
      entry: currentPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      risk_reward: 2.0,
      confidence_score: 0,
      historical_win_rate: 0,
      regime,
      confluences: ['RSI Oversold/Overbought', 'Probabilistic Range'],
      reasoning: `Mean reversion ${bias} (P=${regime.probabilities.RANGE.toFixed(2)})`,
      invalidation_reason: 'Range breakout',
      timestamp: Date.now(),
      features: features as any
    };
  }
}
