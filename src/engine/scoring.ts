import { Signal, FeatureWeights } from '../types';

export class ScoringEngine {
  private weights: FeatureWeights = {
    trendStrength: 0.3,
    momentum: 0.2,
    volatility: 0.1,
    liquidityZoneDist: 0.2,
    isLondonSession: 0.1,
    isNYSession: 0.1
  };

  constructor(initialWeights?: FeatureWeights) {
    if (initialWeights) {
      this.weights = { ...this.weights, ...initialWeights };
    }
  }

  updateWeights(newWeights: FeatureWeights) {
    this.weights = { ...this.weights, ...newWeights };
  }

  calculateScore(signal: Signal): number {
    const features = signal.features;
    let score = 0;

    // Normalize and weight features
    // Trend strength: higher is better for TREND signals
    if (signal.regime === 'TREND') {
      score += Math.min(Math.abs(features.trendStrength) * 10, 1) * this.weights.trendStrength;
    } else {
      score += (1 - Math.min(Math.abs(features.trendStrength) * 10, 1)) * this.weights.trendStrength;
    }

    // Momentum: 30-70 range normalization
    const momScore = Math.abs(features.momentum - 50) / 50;
    score += momScore * this.weights.momentum;

    // Liquidity
    score += (1 - Math.min(features.liquidityZoneDist, 1)) * this.weights.liquidityZoneDist;

    // Session
    if (features.isLondonSession) score += this.weights.isLondonSession;
    if (features.isNYSession) score += this.weights.isNYSession;

    // Scale to 0-100
    return Math.min(Math.round(score * 100), 100);
  }

  getWeights(): FeatureWeights {
    return this.weights;
  }
}
