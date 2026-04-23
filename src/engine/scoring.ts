import { Signal, FeatureWeights } from '../types';
import { AdaptiveModule } from '../learning/adaptiveModule';

export class ScoringEngine {
  private weights: FeatureWeights = {
    trendStrength: 0.3,
    momentum: 0.2,
    volatility: 0.1,
    liquidityZoneDist: 0.2,
    isLondonSession: 0.1,
    isNYSession: 0.1
  };

  constructor(private adaptiveModule: AdaptiveModule, initialWeights?: FeatureWeights) {
    if (initialWeights) {
      this.weights = { ...this.weights, ...initialWeights };
    }
  }

  updateWeights(newWeights: FeatureWeights) {
    this.weights = { ...this.weights, ...newWeights };
  }

  calculateScore(signal: Signal): number {
    const features = signal.features;
    let baseScore = 0;

    // Weighted sum for raw feature strength
    if (signal.regime === 'TREND') {
      baseScore += Math.min(Math.abs(features.trendStrength) * 10, 1) * this.weights.trendStrength;
    } else {
      baseScore += (1 - Math.min(Math.abs(features.trendStrength) * 10, 1)) * this.weights.trendStrength;
    }

    const momScore = Math.abs(features.momentum - 50) / 50;
    baseScore += momScore * this.weights.momentum;
    baseScore += (1 - Math.min(features.liquidityZoneDist, 1)) * this.weights.liquidityZoneDist;

    if (features.isLondonSession) baseScore += this.weights.isLondonSession;
    if (features.isNYSession) baseScore += this.weights.isNYSession;

    // REAL INTELLIGENCE: Adjust score based on historical conditional expectancy
    const session = features.isLondonSession ? 'LONDON' : (features.isNYSession ? 'NY' : 'OTHER');
    const conditionalWinRate = this.adaptiveModule.getConditionalWinRate({
      regime: signal.regime,
      strategyName: signal.strategyName,
      session: session
    });

    // Blend baseScore with historical performance (Bayesian-lite approach)
    // If we have data, lean towards historical performance
    const finalScore = (baseScore * 0.4) + (conditionalWinRate * 0.6);

    return Math.min(Math.round(finalScore * 100), 100);
  }

  getWeights(): FeatureWeights {
    return this.weights;
  }
}
