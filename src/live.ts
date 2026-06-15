import { Strategy } from './strategies/base';
import { ScoringEngine } from './engine/scoring';
import { FeatureExtractor } from './core/featureExtractor';
import { OHLCV, Signal } from './types';
import { RiskManager } from './engine/riskManager';

export class LiveEngine {
  private riskManager = new RiskManager();

  constructor(
    private strategies: Strategy[],
    private scoringEngine: ScoringEngine
  ) {}

  generateLiveSignal(candles: OHLCV[]): Signal | null {
    const allFeatures = FeatureExtractor.extractAll(candles);
    const lastIdx = allFeatures.length - 1;
    const currentFeatures = allFeatures[lastIdx];
    const data = { pair: 'LIVE', candles };

    const signals: Signal[] = [];

    for (const strategy of this.strategies) {
      const signal = strategy.generateSignal(data, currentFeatures);
      if (signal) {
        signal.confidence_score = this.scoringEngine.calculateScore(signal);

        // Calculate lot size and leverage for live signals
        // Assuming a standard $10,000 account for calculation if no portfolio provided
        const mockPortfolio = { balance: 10000, openPositions: 0, dailyPnL: 0, currentEquity: 10000 };
        const riskAmount = this.riskManager.calculatePositionSize(signal, mockPortfolio);
        const riskDistance = Math.abs(signal.entry - signal.stop_loss);

        // Lot size = Risk Amount / (Stop Loss Distance * Pip Value)
        // Simplified for EURUSD (1 lot = 100,000, 1 pip = 0.0001)
        // For simplicity: Lot Size = (Risk Amount / riskDistance) / 100000
        signal.lot_size = Number(((riskAmount / riskDistance) / 100000).toFixed(2));
        signal.leverage = Number(((signal.lot_size * 100000) / mockPortfolio.balance).toFixed(1));

        signals.push(signal);
      }
    }

    if (signals.length === 0) return null;
    return signals.sort((a, b) => b.confidence_score - a.confidence_score)[0];
  }
}
