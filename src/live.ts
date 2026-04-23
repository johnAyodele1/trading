import { TrendFollowingStrategy, MeanReversionStrategy } from './strategies/base';
import { ScoringEngine } from './engine/scoring';
import { AdaptiveModule } from './learning/adaptiveModule';
import { FeatureExtractor } from './core/featureExtractor';
import { OHLCV } from './types';

export class LiveEngine {
  constructor(
    private strategies: any[],
    private scoringEngine: ScoringEngine
  ) {}

  generateLiveSignal(candles: OHLCV[]): any | null {
    const allFeatures = FeatureExtractor.extractAll(candles);
    const lastIdx = allFeatures.length - 1;
    const currentFeatures = allFeatures[lastIdx];
    const data = { pair: 'LIVE', candles };

    const signals: any[] = [];

    for (const strategy of this.strategies) {
      const signal = strategy.generateSignal(data, currentFeatures);
      if (signal) {
        signal.confidence_score = this.scoringEngine.calculateScore(signal);
        signals.push(signal);
      }
    }

    // Return highest confidence signal
    if (signals.length === 0) return null;
    return signals.sort((a, b) => b.confidence_score - a.confidence_score)[0];
  }
}
