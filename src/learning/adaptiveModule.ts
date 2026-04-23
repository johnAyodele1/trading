import { Signal, TradeOutcome, FeatureWeights, MarketRegime } from '../types';

interface HistoricalSignal {
  signal: Signal;
  outcome: TradeOutcome | null;
}

export class AdaptiveModule {
  private history: HistoricalSignal[] = [];

  recordSignal(signal: Signal) {
    this.history.push({ signal, outcome: null });
  }

  recordOutcome(signalId: string, outcome: TradeOutcome) {
    const entry = this.history.find(h => h.signal.id === signalId);
    if (entry) {
      entry.outcome = outcome;
    }
  }

  getConditionalWinRate(criteria: { regime?: MarketRegime; strategyName?: string; session?: string }): number {
    const relevant = this.history.filter(h => {
      if (!h.outcome) return false;
      if (criteria.regime && h.outcome.context.regime !== criteria.regime) return false;
      if (criteria.strategyName && h.outcome.context.strategyName !== criteria.strategyName) return false;
      if (criteria.session && h.outcome.context.session !== criteria.session) return false;
      return true;
    });

    if (relevant.length < 3) return 0.5;

    const wins = relevant.filter(h => h.outcome?.outcome === 'WIN').length;
    return wins / relevant.length;
  }

  // Statistical Correlation-based Weight Optimization
  optimizeWeights(currentWeights: FeatureWeights): FeatureWeights {
    const completedTrades = this.history.filter(h => h.outcome !== null);
    if (completedTrades.length < 15) return currentWeights;

    // We only look at the last 50 trades to maintain "rolling" relevancy
    const lookbackTrades = completedTrades.slice(-50);
    const newWeights = { ...currentWeights };
    const features = Object.keys(currentWeights);

    for (const feature of features) {
      const values = lookbackTrades.map(t => Number(t.signal.features[feature]));
      const outcomes = lookbackTrades.map(t => t.outcome?.outcome === 'WIN' ? 1 : 0);

      const correlation = this.calculateCorrelation(values, outcomes);

      // If correlation is positive, the feature value aligns with winning.
      // We adjust weights based on the strength of this correlation.
      if (Math.abs(correlation) > 0.1) {
        if (correlation > 0) {
            newWeights[feature] *= (1 + correlation * 0.2);
        } else {
            newWeights[feature] *= (1 + correlation * 0.1); // Reduce weight if negatively correlated
        }
      }

      newWeights[feature] = Math.max(0.05, Math.min(newWeights[feature], 0.4));
    }

    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    for (const f of features) newWeights[f] /= total;

    return newWeights;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  getWinRate(): number {
    const completed = this.history.filter(h => h.outcome !== null);
    if (completed.length === 0) return 0.5;
    return completed.filter(h => h.outcome?.outcome === 'WIN').length / completed.length;
  }
}
