import { OHLCV, MarketData, Signal, TradeOutcome, PerformanceMetrics } from '../types';
import { Strategy } from '../strategies/base';
import { ScoringEngine } from '../engine/scoring';
import { AdaptiveModule } from '../learning/adaptiveModule';
import { FeatureExtractor } from '../core/featureExtractor';

export class Backtester {
  private signals: Signal[] = [];
  private outcomes: TradeOutcome[] = [];

  private spread = 0.00015;
  private commission = 0.00005;
  private slippage = 0.00005;

  constructor(
    private strategies: Strategy[],
    private scoringEngine: ScoringEngine,
    private adaptiveModule: AdaptiveModule
  ) {}

  run(pair: string, candles: OHLCV[]): PerformanceMetrics {
    const lookback = 200;

    // O(n) Optimization: Pre-calculate all features once
    const allFeatures = FeatureExtractor.extractAll(candles);

    for (let i = lookback; i < candles.length - 51; i++) {
      const features = allFeatures[i];
      const data: MarketData = {
        pair,
        timeframe: 'H1',
        candles: candles.slice(0, i + 1) // Still pass candles for logic that needs it, but features are pre-extracted
      };

      for (const strategy of this.strategies) {
        // Strategy should ideally use pre-extracted features
        const signal = strategy.generateSignal(data, features);
        if (signal) {
          signal.confidence_score = this.scoringEngine.calculateScore(signal);

          if (signal.confidence_score > 55) {
            const nextCandle = candles[i + 1];
            const outcome = this.simulateTrade(signal, nextCandle, candles.slice(i + 2));

            if (outcome) {
              this.signals.push(signal);
              this.adaptiveModule.recordSignal(signal);
              this.outcomes.push(outcome);
              this.adaptiveModule.recordOutcome(signal.id, outcome);

              const winLabel = outcome.outcome === 'WIN' ? 1 : 0;
              this.scoringEngine.trainModel(signal.features, winLabel);
            }
          }
        }
      }
    }

    return this.calculateMetrics();
  }

  private simulateTrade(signal: Signal, entryCandle: OHLCV, futureCandles: OHLCV[]): TradeOutcome | null {
    const totalCosts = this.spread + this.commission + this.slippage;
    const actualEntry = signal.bias === 'BUY' ? entryCandle.open + (totalCosts / 2) : entryCandle.open - (totalCosts / 2);

    const entryOutcome = this.checkCandle(signal, entryCandle, actualEntry, totalCosts, 0);
    if (entryOutcome) return entryOutcome;

    for (let i = 0; i < futureCandles.length; i++) {
      const outcome = this.checkCandle(signal, futureCandles[i], actualEntry, totalCosts, i + 1);
      if (outcome) return outcome;
    }
    return null;
  }

  private checkCandle(signal: Signal, candle: OHLCV, entryPrice: number, totalCosts: number, duration: number): TradeOutcome | null {
    const exitCosts = totalCosts / 2;

    if (signal.bias === 'BUY') {
      if (candle.low <= signal.stop_loss) {
        return {
          signalId: signal.id,
          outcome: 'LOSS',
          pnl: ((signal.stop_loss - exitCosts) - entryPrice) / (entryPrice - signal.stop_loss),
          exitPrice: signal.stop_loss - exitCosts,
          exitTimestamp: candle.timestamp,
          heldDuration: duration,
          context: { regime: signal.regime, strategyName: signal.strategyName, session: this.getSession(signal) }
        };
      }
      if (candle.high >= signal.take_profit) {
        return {
          signalId: signal.id,
          outcome: 'WIN',
          pnl: ((signal.take_profit - exitCosts) - entryPrice) / (entryPrice - signal.stop_loss),
          exitPrice: signal.take_profit - exitCosts,
          exitTimestamp: candle.timestamp,
          heldDuration: duration,
          context: { regime: signal.regime, strategyName: signal.strategyName, session: this.getSession(signal) }
        };
      }
    } else {
      if (candle.high >= signal.stop_loss) {
        return {
          signalId: signal.id,
          outcome: 'LOSS',
          pnl: (entryPrice - (signal.stop_loss + exitCosts)) / (signal.stop_loss - entryPrice),
          exitPrice: signal.stop_loss + exitCosts,
          exitTimestamp: candle.timestamp,
          heldDuration: duration,
          context: { regime: signal.regime, strategyName: signal.strategyName, session: this.getSession(signal) }
        };
      }
      if (candle.low <= signal.take_profit) {
        return {
          signalId: signal.id,
          outcome: 'WIN',
          pnl: (entryPrice - (signal.take_profit + exitCosts)) / (signal.stop_loss - entryPrice),
          exitPrice: signal.take_profit + exitCosts,
          exitTimestamp: candle.timestamp,
          heldDuration: duration,
          context: { regime: signal.regime, strategyName: signal.strategyName, session: this.getSession(signal) }
        };
      }
    }
    return null;
  }

  private getSession(signal: Signal): string {
    return signal.features.isLondonSession ? 'LONDON' : (signal.features.isNYSession ? 'NY' : 'OTHER');
  }

  private calculateMetrics(): PerformanceMetrics {
    const totalTrades = this.outcomes.length;
    if (totalTrades === 0) return { winRate: 0, profitFactor: 0, maxDrawdown: 0, expectancy: 0, totalTrades: 0 };

    const wins = this.outcomes.filter(o => o.outcome === 'WIN');
    const losses = this.outcomes.filter(o => o.outcome === 'LOSS');
    const winRate = wins.length / totalTrades;

    const grossProfit = wins.reduce((s, o) => s + Math.max(0, o.pnl), 0);
    const grossLoss = Math.abs(losses.reduce((s, o) => s + Math.min(0, o.pnl), 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    const expectancy = this.outcomes.reduce((s, o) => s + o.pnl, 0) / totalTrades;

    let maxDrawdown = 0;
    let peakPnL = 0;
    let currentPnL = 0;

    for (const outcome of this.outcomes) {
      currentPnL += outcome.pnl;
      if (currentPnL > peakPnL) peakPnL = currentPnL;
      const dd = peakPnL - currentPnL;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    return { winRate, profitFactor, maxDrawdown, expectancy, totalTrades };
  }

  getSignals() { return this.signals; }
}
