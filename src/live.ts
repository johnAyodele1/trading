import { Strategy } from './strategies/base';
import { ScoringEngine } from './engine/scoring';
import { FeatureExtractor } from './core/featureExtractor';
import { OHLCV, Signal } from './types';

export class LiveEngine {
  constructor(
    private strategies: Strategy[],
    private scoringEngine: ScoringEngine
  ) {}

  generateLiveSignal(candles: OHLCV[]): Signal | null {
    const allFeatures = FeatureExtractor.extractAll(candles);
    const lastIdx = allFeatures.length - 1;
    const currentFeatures = allFeatures[lastIdx];
    const data = { pair: 'LIVE', candles };

    const signals: Signal[] = [];

    for (const strategy of this.strategies) {
      const signal = strategy.generateSignal(data, currentFeatures);
      if (signal) {
        signal.confidence_score = this.scoringEngine.calculateScore(signal);
        signals.push(signal);
      }
    }

    if (signals.length === 0) return null;
    return signals.sort((a, b) => b.confidence_score - a.confidence_score)[0];
  }
}
