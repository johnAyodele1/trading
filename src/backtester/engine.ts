import { OHLCV, MarketData, Signal, TradeOutcome, PerformanceMetrics } from '../types';
import { Strategy } from '../strategies/base';
import { ScoringEngine } from '../engine/scoring';
import { AdaptiveModule } from '../learning/adaptiveModule';

export class Backtester {
  private signals: Signal[] = [];
  private outcomes: TradeOutcome[] = [];

  // Realistic transaction costs
  private spread = 0.00015; // 1.5 pips
  private commission = 0.00005; // 0.5 pips equivalent
  private slippage = 0.00005; // 0.5 pips average slippage

  constructor(
    private strategies: Strategy[],
    private scoringEngine: ScoringEngine,
    private adaptiveModule: AdaptiveModule
  ) {}

  run(pair: string, candles: OHLCV[]): PerformanceMetrics {
    const lookback = 100;

    for (let i = lookback; i < candles.length - 50; i++) {
      const window = candles.slice(0, i);
      const data: MarketData = { pair, timeframe: 'H1', candles: window };

      for (const strategy of this.strategies) {
        const signal = strategy.generateSignal(data);
        if (signal) {
          signal.confidence_score = this.scoringEngine.calculateScore(signal);
          signal.historical_win_rate = this.adaptiveModule.getWinRate();

          if (signal.confidence_score > 55) {
            this.signals.push(signal);
            this.adaptiveModule.recordSignal(signal);

            const outcome = this.simulateTrade(signal, candles.slice(i));
            if (outcome) {
              this.outcomes.push(outcome);
              this.adaptiveModule.recordOutcome(signal.id, outcome);

              if (this.outcomes.length % 20 === 0) {
                const newWeights = this.adaptiveModule.optimizeWeights(this.scoringEngine.getWeights());
                this.scoringEngine.updateWeights(newWeights);
              }
            }
          }
        }
      }
    }

    return this.calculateMetrics();
  }

  private simulateTrade(signal: Signal, futureCandles: OHLCV[]): TradeOutcome | null {
    const totalCosts = this.spread + this.commission + this.slippage;

    // Adjust entry price by slippage and half-spread
    const entryPrice = signal.bias === 'BUY' ? signal.entry + (totalCosts / 2) : signal.entry - (totalCosts / 2);

    for (let i = 0; i < futureCandles.length; i++) {
      const candle = futureCandles[i];

      // Check Stop Loss
      if (signal.bias === 'BUY' && candle.low <= signal.stop_loss) {
        return {
          signalId: signal.id,
          outcome: 'LOSS',
          pnl: -1 - (totalCosts / (signal.entry - signal.stop_loss)),
          exitPrice: signal.stop_loss,
          exitTimestamp: candle.timestamp,
          heldDuration: i,
          context: this.getTradeContext(signal)
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
          context: this.getTradeContext(signal)
        };
      }

      // Check Take Profit
      if (signal.bias === 'BUY' && candle.high >= signal.take_profit) {
        return {
          signalId: signal.id,
          outcome: 'WIN',
          pnl: signal.risk_reward - (totalCosts / (signal.take_profit - signal.entry)),
          exitPrice: signal.take_profit,
          exitTimestamp: candle.timestamp,
          heldDuration: i,
          context: this.getTradeContext(signal)
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
          context: this.getTradeContext(signal)
        };
      }
    }
    return null;
  }

  private getTradeContext(signal: Signal) {
    const session = signal.features.isLondonSession ? 'LONDON' : (signal.features.isNYSession ? 'NY' : 'OTHER');
    return {
      regime: signal.regime,
      strategyName: signal.strategyName,
      session: session
    };
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

    let cumulativePnL = 0;
    let maxPnL = 0;
    let maxDD = 0;
    for (const outcome of this.outcomes) {
      cumulativePnL += outcome.pnl;
      if (cumulativePnL > maxPnL) maxPnL = cumulativePnL;
      const dd = maxPnL - cumulativePnL;
      if (dd > maxDD) maxDD = dd;
    }

    return {
      winRate,
      profitFactor,
      maxDrawdown: maxDD,
      expectancy,
      totalTrades
    };
  }

  getSignals() { return this.signals; }
}
