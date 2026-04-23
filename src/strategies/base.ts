import { Signal, MarketData, OHLCV, Bias } from '../types';
import { FeatureExtractor } from '../core/featureExtractor';
import { RegimeDetection } from '../core/regimeDetection';

export interface Strategy {
  name: string;
  generateSignal(data: MarketData): Signal | null;
}

export class TrendFollowingStrategy implements Strategy {
  name = 'TrendFollowing';

  generateSignal(data: MarketData): Signal | null {
    const candles = data.candles;
    const regime = RegimeDetection.detect(candles);

    if (regime !== 'TREND') return null;

    const features = FeatureExtractor.extract(candles);
    const currentPrice = candles[candles.length - 1].close;

    // Trend following logic: EMA slope and RSI confirmation
    const bias: Bias = features.trendStrength > 0 ? 'BUY' : 'SELL';

    if (bias === 'BUY' && (features.momentum > 70 || features.momentum < 40)) return null; // Overextended or weak
    if (bias === 'SELL' && (features.momentum < 30 || features.momentum > 60)) return null;

    const atr = features.volatility * currentPrice / 100;
    const stopLoss = bias === 'BUY' ? currentPrice - 2 * atr : currentPrice + 2 * atr;
    const takeProfit = bias === 'BUY' ? currentPrice + 4 * atr : currentPrice - 4 * atr;

    return {
      pair: data.pair,
      bias,
      entry: currentPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      risk_reward: 2.0,
      confidence_score: 0, // To be filled by Scoring Engine
      historical_win_rate: 0,
      regime,
      confluences: ['Trend Strength', 'Momentum Confirmation', 'Session Alignment'],
      reasoning: `Trend following ${bias} signal based on strength ${features.trendStrength.toFixed(2)}`,
      invalidation_reason: 'Trend reversal or momentum exhaustion',
      timestamp: Date.now(),
      features: features as any
    };
  }
}

export class MeanReversionStrategy implements Strategy {
  name = 'MeanReversion';

  generateSignal(data: MarketData): Signal | null {
    const candles = data.candles;
    const regime = RegimeDetection.detect(candles);

    if (regime !== 'RANGE') return null;

    const features = FeatureExtractor.extract(candles);
    const currentPrice = candles[candles.length - 1].close;

    // Mean reversion: RSI oversold/overbought in range
    let bias: Bias | null = null;
    if (features.momentum < 30) bias = 'BUY';
    if (features.momentum > 70) bias = 'SELL';

    if (!bias) return null;

    const atr = features.volatility * currentPrice / 100;
    const stopLoss = bias === 'BUY' ? currentPrice - 1.5 * atr : currentPrice + 1.5 * atr;
    const takeProfit = bias === 'BUY' ? currentPrice + 3 * atr : currentPrice - 3 * atr;

    return {
      pair: data.pair,
      bias,
      entry: currentPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      risk_reward: 2.0,
      confidence_score: 0,
      historical_win_rate: 0,
      regime,
      confluences: ['RSI Oversold/Overbought', 'Range Regime'],
      reasoning: `Mean reversion ${bias} in ranging market`,
      invalidation_reason: 'Range breakout',
      timestamp: Date.now(),
      features: features as any
    };
  }
}
