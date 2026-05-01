import { Signal, TradeOutcome, MarketRegimeType } from '../types';

interface HistoricalSignal {
  signal: Signal;
  outcome: TradeOutcome | null;
}

export class AdaptiveModule {
  private history: HistoricalSignal[] = [];
  private decayFactor = 0.98;

  recordSignal(signal: Signal) {
    this.history.push({ signal, outcome: null });
  }

  recordOutcome(signalId: string, outcome: TradeOutcome) {
    const entry = this.history.find(h => h.signal.id === signalId);
    if (entry) {
      entry.outcome = outcome;
    }
  }

  // Use simulation 'now' for realistic decay during backtests
  getConditionalWinRate(criteria: { regime?: MarketRegimeType; strategyName?: string; session?: string }, simulationTime?: number): number {
    const now = simulationTime || Date.now();
    let weightedWins = 0;
    let weightedTotal = 0;

    for (const h of this.history) {
      if (!h.outcome) continue;

      if (criteria.regime && h.outcome.context.regime.primary !== criteria.regime) continue;
      if (criteria.strategyName && h.outcome.context.strategyName !== criteria.strategyName) continue;
      if (criteria.session && h.outcome.context.session !== criteria.session) continue;

      // Decay relative to the time the signal was generated in the simulation
      const hoursAgo = (now - h.signal.timestamp) / 3600000;
      const weight = Math.pow(this.decayFactor, Math.max(0, hoursAgo));

      if (h.outcome.outcome === 'WIN') {
        weightedWins += weight;
      }
      weightedTotal += weight;
    }

    if (weightedTotal < 0.1) return 0.5;
    return weightedWins / weightedTotal;
  }

  getWinRate(): number {
    const completed = this.history.filter(h => h.outcome !== null);
    if (completed.length === 0) return 0.5;
    return completed.filter(h => h.outcome?.outcome === 'WIN').length / completed.length;
  }
}
