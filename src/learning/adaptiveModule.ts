import { Signal, TradeOutcome, FeatureWeights } from '../types';

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
    const entry = this.history.find(h => h.signal.timestamp.toString() === signalId);
    if (entry) {
      entry.outcome = outcome;
    }
  }

  optimizeWeights(currentWeights: FeatureWeights): FeatureWeights {
    const completedTrades = this.history.filter(h => h.outcome !== null);
    if (completedTrades.length < 10) return currentWeights;

    const newWeights = { ...currentWeights };
    const features = Object.keys(currentWeights);

    for (const feature of features) {
      // Simple correlation-based adjustment
      // If feature value was high and result was WIN, increase weight slightly
      const wins = completedTrades.filter(t => t.outcome?.outcome === 'WIN');
      const losses = completedTrades.filter(t => t.outcome?.outcome === 'LOSS');

      const avgFeatureWin = wins.reduce((sum, t) => sum + (t.signal.features[feature] || 0), 0) / wins.length;
      const avgFeatureLoss = losses.reduce((sum, t) => sum + (t.signal.features[feature] || 0), 0) / losses.length;

      if (Math.abs(avgFeatureWin) > Math.abs(avgFeatureLoss)) {
        newWeights[feature] = Math.min(newWeights[feature] * 1.05, 0.5);
      } else {
        newWeights[feature] = Math.max(newWeights[feature] * 0.95, 0.05);
      }
    }

    // Re-normalize weights to sum to ~1
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    for (const feature of features) {
      newWeights[feature] /= total;
    }

    return newWeights;
  }

  getWinRate(): number {
    const completed = this.history.filter(h => h.outcome !== null);
    if (completed.length === 0) return 0;
    const wins = completed.filter(h => h.outcome?.outcome === 'WIN').length;
    return wins / completed.length;
  }

  getPerformanceStats() {
    const completed = this.history.filter(h => h.outcome !== null);
    const winRate = this.getWinRate();
    const totalPnL = completed.reduce((sum, h) => sum + (h.outcome?.pnl || 0), 0);

    return {
      winRate,
      totalPnL,
      totalTrades: completed.length
    };
  }
}
