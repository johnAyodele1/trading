import { TrendFollowingStrategy, MeanReversionStrategy } from './strategies/base';
import { ScoringEngine } from './engine/scoring';
import { AdaptiveModule } from './learning/adaptiveModule';
import { Backtester } from './backtester/engine';
import { OHLCV } from './types';

// Demo Data Generation
const generateData = (count: number): OHLCV[] => {
  const candles: OHLCV[] = [];
  let price = 1.0850;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * 0.002;
    const open = price;
    const close = price + change;
    candles.push({
      timestamp: Date.now() - (count - i) * 3600000,
      open, high: Math.max(open, close) + 0.0005, low: Math.min(open, close) - 0.0005, close, volume: 100
    });
    price = close;
  }
  return candles;
};

async function main() {
  console.log('--- Forex Trade Intelligence Engine ---');

  const candles = generateData(1000);
  const strategies = [new TrendFollowingStrategy(), new MeanReversionStrategy()];
  const scoringEngine = new ScoringEngine();
  const adaptiveModule = new AdaptiveModule();
  const backtester = new Backtester(strategies, scoringEngine, adaptiveModule);

  console.log('\nRunning historical backtest and learning...');
  const results = backtester.run('EURUSD', candles);

  console.log('\n--- Backtest Results ---');
  console.log(`Pair: EURUSD`);
  console.log(`Total Trades: ${results.totalTrades}`);
  console.log(`Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
  console.log(`Profit Factor: ${results.profitFactor.toFixed(2)}`);
  console.log(`Max Drawdown: ${results.maxDrawdown.toFixed(2)} units`);
  console.log(`Expectancy: ${results.expectancy.toFixed(2)}`);

  console.log('\n--- Adaptive Learning ---');
  console.log('Final Feature Weights:');
  console.log(JSON.stringify(scoringEngine.getWeights(), null, 2));

  const signals = backtester.getSignals();
  if (signals.length > 0) {
    console.log('\n--- Latest Signal Generated ---');
    const lastSignal = signals[signals.length - 1];
    console.log(JSON.stringify(lastSignal, null, 2));
  }
}

main().catch(console.error);
