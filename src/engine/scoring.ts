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
      'isLondonSession',
      'isNYSession'
    ]);
  }

  calculateScore(signal: Signal): number {
    // 1. Get P(win | features) from probabilistic model
    const winProbability = this.model.predict(signal.features);

    // 2. Get historical success of the specific context (Regime, Session, Strategy)
    const session = signal.features.isLondonSession ? 'LONDON' : (signal.features.isNYSession ? 'NY' : 'OTHER');
    const conditionalWinRate = this.adaptiveModule.getConditionalWinRate({
      regime: signal.regime.primary,
      strategyName: signal.strategyName,
      session: session
    });

    // 3. Bayesian blending: Combine prediction with historical base rates
    // Weighted Blend: 70% model prediction, 30% historical context evidence
    const finalScore = (winProbability * 0.7) + (conditionalWinRate * 0.3);

    return Math.min(Math.round(finalScore * 100), 100);
  }

  trainModel(features: Record<string, any>, outcome: number) {
    this.model.train(features, outcome);
  }

  getWeights() {
    return this.model.getCoefficients();
  }
}
