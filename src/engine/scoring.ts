import { Signal } from '../types';
import { AdaptiveModule } from '../learning/adaptiveModule';
import { ProbabilisticModel } from './probabilisticModel';

export class ScoringEngine {
  private models: Map<string, ProbabilisticModel> = new Map();

  constructor(private adaptiveModule: AdaptiveModule) {}

  private getModel(symbol: string): ProbabilisticModel {
    if (!this.models.has(symbol)) {
      // META-LEARNER: Integrated cross-asset and session patterns into core model
      const model = new ProbabilisticModel([
        'trendStrength',
        'momentum',
        'volatility',
        'liquidityZoneDist',
        'regime_TREND',
        'regime_RANGE',
        'session_LONDON',
        'session_NY',
        'dxyCorrelation',
        'londonOpenBias'
      ]);
      this.models.set(symbol, model);
    }
    return this.models.get(symbol)!;
  }

  // initialize and calculateScore remains similar but now naturally weights new features
  calculateScore(signal: Signal, simulationTime?: number): number {
    const model = this.getModel(signal.pair);
    const winProbability = model.predict(signal.features);

    const session = signal.features.isLondonSession ? 'LONDON' : (signal.features.isNYSession ? 'NY' : 'OTHER');
    const conditionalWinRate = this.adaptiveModule.getConditionalWinRate({
      regime: signal.regime.primary,
      strategyName: signal.strategyName,
      session: session
    }, simulationTime);

    const finalScore = (winProbability * 0.8) + (conditionalWinRate * 0.2);
    return Math.min(Math.round(finalScore * 100), 100);
  }

  async trainModel(symbol: string, features: Record<string, any>, outcome: number) {
    const model = this.getModel(symbol);
    model.train(features, outcome);
  }
}
