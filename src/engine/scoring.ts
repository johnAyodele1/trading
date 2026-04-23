import { Signal } from '../types';
import { AdaptiveModule } from '../learning/adaptiveModule';
import { ProbabilisticModel } from './probabilisticModel';

export class ScoringEngine {
  private model: ProbabilisticModel;

  constructor(private adaptiveModule: AdaptiveModule) {
    this.model = new ProbabilisticModel([
      'trendStrength',
      'momentum',
      'volatility',
      'liquidityZoneDist',
      'regime_TREND',
      'regime_RANGE',
      'session_LONDON',
      'session_NY'
    ]);
  }

  calculateScore(signal: Signal): number {
    // Probabilistic Model now handles regime and session as features internally
    const winProbability = this.model.predict(signal.features);

    // Still blend with raw historical frequency for robustness (Bayesian prior)
    const session = signal.features.isLondonSession ? 'LONDON' : (signal.features.isNYSession ? 'NY' : 'OTHER');
    const conditionalWinRate = this.adaptiveModule.getConditionalWinRate({
      regime: signal.regime.primary,
      strategyName: signal.strategyName,
      session: session
    });

    const finalScore = (winProbability * 0.8) + (conditionalWinRate * 0.2);

    return Math.min(Math.round(finalScore * 100), 100);
  }

  trainModel(features: Record<string, any>, outcome: number) {
    this.model.train(features, outcome);
  }

  getWeights() {
    return this.model.getCoefficients();
  }
}
