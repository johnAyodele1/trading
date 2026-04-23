import { OHLCV, MarketData, Signal, TradeOutcome, PerformanceMetrics } from '../types';
import { Strategy } from '../strategies/base';
import { ScoringEngine } from '../engine/scoring';
import { AdaptiveModule } from '../learning/adaptiveModule';

export class Backtester {
  private signals: Signal[] = [];
  private outcomes: TradeOutcome[] = [];

  constructor(
    private strategies: Strategy[],
    private scoringEngine: ScoringEngine,
    private adaptiveModule: AdaptiveModule
  ) {}

  run(pair: string, candles: OHLCV[]): PerformanceMetrics {
    const lookback = 100;

    for (let i = lookback; i < candles.length - 20; i++) {
      const window = candles.slice(0, i);
      const data: MarketData = { pair, timeframe: 'H1', candles: window };

      for (const strategy of this.strategies) {
        const signal = strategy.generateSignal(data);
        if (signal) {
          signal.confidence_score = this.scoringEngine.calculateScore(signal);
          signal.historical_win_rate = this.adaptiveModule.getWinRate();

          if (signal.confidence_score > 50) { // Confidence threshold
            this.signals.push(signal);
            this.adaptiveModule.recordSignal(signal);

            // Simulate outcome
            const outcome = this.simulateTrade(signal, candles.slice(i));
            if (outcome) {
              this.outcomes.push(outcome);
              this.adaptiveModule.recordOutcome(signal.timestamp.toString(), outcome);

              // Periodically optimize
              if (this.outcomes.length % 10 === 0) {
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
    for (let i = 0; i < futureCandles.length; i++) {
      const candle = futureCandles[i];

      // Check Stop Loss
      if (signal.bias === 'BUY' && candle.low <= signal.stop_loss) {
        return {
          signalId: signal.timestamp.toString(),
          outcome: 'LOSS',
          pnl: -1,
          exitPrice: signal.stop_loss,
          exitTimestamp: candle.timestamp,
          heldDuration: i
        };
      }
      if (signal.bias === 'SELL' && candle.high >= signal.stop_loss) {
        return {
          signalId: signal.timestamp.toString(),
          outcome: 'LOSS',
          pnl: -1,
          exitPrice: signal.stop_loss,
          exitTimestamp: candle.timestamp,
          heldDuration: i
        };
      }

      // Check Take Profit
      if (signal.bias === 'BUY' && candle.high >= signal.take_profit) {
        return {
          signalId: signal.timestamp.toString(),
          outcome: 'WIN',
          pnl: signal.risk_reward,
          exitPrice: signal.take_profit,
          exitTimestamp: candle.timestamp,
          heldDuration: i
        };
      }
      if (signal.bias === 'SELL' && candle.low <= signal.take_profit) {
        return {
          signalId: signal.timestamp.toString(),
          outcome: 'WIN',
          pnl: signal.risk_reward,
          exitPrice: signal.take_profit,
          exitTimestamp: candle.timestamp,
          heldDuration: i
        };
      }
    }
    return null;
  }

  private calculateMetrics(): PerformanceMetrics {
    const totalTrades = this.outcomes.length;
    if (totalTrades === 0) return { winRate: 0, profitFactor: 0, maxDrawdown: 0, expectancy: 0, totalTrades: 0 };

    const wins = this.outcomes.filter(o => o.outcome === 'WIN');
    const losses = this.outcomes.filter(o => o.outcome === 'LOSS');

    const winRate = wins.length / totalTrades;

    const grossProfit = wins.reduce((s, o) => s + o.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, o) => s + o.pnl, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    const expectancy = (winRate * 2) - ((1 - winRate) * 1); // Simplified expectancy

    // Simple max drawdown calculation based on cumulative PnL
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
