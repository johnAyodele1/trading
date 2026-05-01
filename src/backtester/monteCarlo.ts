import { TradeOutcome } from '../types';

export class MonteCarloSimulator {
  static run(outcomes: TradeOutcome[], iterations: number = 1000) {
    if (outcomes.length < 5) return { stability: 0 };

    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const shuffled = [...outcomes].sort(() => Math.random() - 0.5);
      let pnl = 0;
      let maxDD = 0;
      let peak = 0;

      for (const t of shuffled) {
        pnl += t.pnl;
        if (pnl > peak) peak = pnl;
        const dd = peak - pnl;
        if (dd > maxDD) maxDD = dd;
      }
      results.push(pnl / (maxDD || 1)); // Return to Drawdown ratio
    }

    const mean = results.reduce((a, b) => a + b, 0) / iterations;
    return { stability: mean };
  }
}
