import { OHLCV, MarketData, Signal, TradeOutcome, PerformanceMetrics } from '../types';
import { Strategy } from '../strategies/base';
import { ScoringEngine } from '../engine/scoring';
import { AdaptiveModule } from '../learning/adaptiveModule';

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

    for (let i = lookback; i < candles.length - 50; i++) {
      const window = candles.slice(0, i);
      const data: MarketData = { pair, timeframe: 'H1', candles: window };

      for (const strategy of this.strategies) {
        const signal = strategy.generateSignal(data);
        if (signal) {
          signal.confidence_score = this.scoringEngine.calculateScore(signal);

          if (signal.confidence_score > 55) {
            this.signals.push(signal);
            this.adaptiveModule.recordSignal(signal);

            const outcome = this.simulateTrade(signal, candles.slice(i));
            if (outcome) {
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

  private simulateTrade(signal: Signal, futureCandles: OHLCV[]): TradeOutcome | null {
    const totalCosts = this.spread + this.commission + this.slippage;
    const entryPrice = signal.bias === 'BUY' ? signal.entry + (totalCosts / 2) : signal.entry - (totalCosts / 2);

    for (let i = 0; i < futureCandles.length; i++) {
      const candle = futureCandles[i];
      if (signal.bias === 'BUY' && candle.low <= signal.stop_loss) {
        return {
          signalId: signal.id,
          outcome: 'LOSS',
          pnl: -1 - (totalCosts / (signal.entry - signal.stop_loss)),
          exitPrice: signal.stop_loss,
          exitTimestamp: candle.timestamp,
          heldDuration: i,
          context: {
            regime: signal.regime,
            strategyName: signal.strategyName,
            session: this.getSession(signal)
          }
        };
      }
      if (signal.bias === 'SELL' && candle.high >= signal.stop_loss) {
        return {
          signalId: signal.id,
          outcome: 'LOSS',
          pnl: -1 - (totalCosts / (signal.stop_loss - signal.entry)),
          exitPrice: signal.stop_loss,
          exitTimestamp: candle.timestamp,
          heldDuration: i,
          context: {
            regime: signal.regime,
            strategyName: signal.strategyName,
            session: this.getSession(signal)
          }
        };
      }
      if (signal.bias === 'BUY' && candle.high >= signal.take_profit) {
        return {
          signalId: signal.id,
          outcome: 'WIN',
          pnl: signal.risk_reward - (totalCosts / (signal.take_profit - signal.entry)),
          exitPrice: signal.take_profit,
          exitTimestamp: candle.timestamp,
          heldDuration: i,
          context: {
            regime: signal.regime,
            strategyName: signal.strategyName,
            session: this.getSession(signal)
          }
        };
      }
      if (signal.bias === 'SELL' && candle.low <= signal.take_profit) {
        return {
          signalId: signal.id,
          outcome: 'WIN',
          pnl: signal.risk_reward - (totalCosts / (signal.entry - signal.take_profit)),
          exitPrice: signal.take_profit,
          exitTimestamp: candle.timestamp,
          heldDuration: i,
          context: {
            regime: signal.regime,
            strategyName: signal.strategyName,
            session: this.getSession(signal)
          }
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
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);
    return { winRate, profitFactor, maxDrawdown: 0, expectancy, totalTrades };
  }

  getSignals() { return this.signals; }
}
