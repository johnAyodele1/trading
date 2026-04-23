import { TrendFollowingStrategy, MeanReversionStrategy } from './strategies/base';
import { ScoringEngine } from './engine/scoring';
import { AdaptiveModule } from './learning/adaptiveModule';
import { Backtester } from './backtester/engine';
import { OHLCV } from './types';

const generateData = (count: number): OHLCV[] => {
  const candles: OHLCV[] = [];
  let price = 1.0850;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.49) * 0.0015; // Slightly more balanced
    const open = price;
    const close = price + change;
    candles.push({
      timestamp: Date.now() - (count - i) * 3600000,
      open, high: Math.max(open, close) + 0.0004, low: Math.min(open, close) - 0.0004, close, volume: 100
    });
    price = close;
  }
  return candles;
};

async function main() {
  console.log('--- Forex Intelligence Engine (Enhanced) ---');

  const candles = generateData(1500);
  const adaptiveModule = new AdaptiveModule();
  const scoringEngine = new ScoringEngine(adaptiveModule);
  const strategies = [new TrendFollowingStrategy(), new MeanReversionStrategy()];
  const backtester = new Backtester(strategies, scoringEngine, adaptiveModule);

  console.log('\nRunning backtest with transaction costs and conditional learning...');
  const results = backtester.run('EURUSD', candles);

  console.log('\n--- Enhanced Backtest Results ---');
  console.log(`Pair: EURUSD`);
  console.log(`Total Trades: ${results.totalTrades}`);
  console.log(`Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
  console.log(`Profit Factor: ${results.profitFactor.toFixed(2)}`);
  console.log(`Max Drawdown: ${results.maxDrawdown.toFixed(2)} units`);
  console.log(`Expectancy: ${results.expectancy.toFixed(5)}`);

  console.log('\n--- Adaptive Weights (Correlation-based) ---');
  console.log(JSON.stringify(scoringEngine.getWeights(), null, 2));

  const signals = backtester.getSignals();
  if (signals.length > 0) {
    console.log('\n--- Latest Signal (Intelligent Calibration) ---');
    const lastSignal = signals[signals.length - 1];
    console.log(JSON.stringify(lastSignal, null, 2));
  }
}

main().catch(console.error);
