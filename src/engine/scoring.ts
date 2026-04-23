import { Signal } from '../types';
import { AdaptiveModule } from '../learning/adaptiveModule';
import { ProbabilisticModel } from './probabilisticModel';
import { Database } from '../data/db';

export class ScoringEngine {
  private models: Map<string, ProbabilisticModel> = new Map();

  constructor(private adaptiveModule: AdaptiveModule) {}

  private getModel(symbol: string): ProbabilisticModel {
    if (!this.models.has(symbol)) {
      const model = new ProbabilisticModel([
        'trendStrength',
        'momentum',
        'volatility',
        'liquidityZoneDist',
        'regime_TREND',
        'regime_RANGE',
        'session_LONDON',
        'session_NY'
      ]);
      this.models.set(symbol, model);
    }
    return this.models.get(symbol)!;
  }

  async initialize(symbols: string[]) {
    for (const symbol of symbols) {
      try {
        const state = await Database.loadModelState(symbol);
        if (state) {
          this.getModel(symbol).loadState(JSON.stringify(state));
        }
      } catch (err) {
        console.error(`Failed to load model state for ${symbol}:`, err);
      }
    }
  }

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

  async trainModel(symbol: string, features: Record<string, number | string | boolean>, outcome: number) {
    const model = this.getModel(symbol);
    model.train(features, outcome);

    try {
      await Database.saveModelState(symbol, JSON.parse(model.saveState()));
    } catch (err) {
      console.error(`Failed to save model state for ${symbol}:`, err);
    }
  }

  getWeights(symbol: string) {
    return this.getModel(symbol).getCoefficients();
  }
}
