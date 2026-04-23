import { TrendFollowingStrategy, MeanReversionStrategy } from './strategies/base';
import { ScoringEngine } from './engine/scoring';
import { AdaptiveModule } from './learning/adaptiveModule';
import { Backtester } from './backtester/engine';
import { YahooFinanceProvider } from './data/yahooFinanceProvider';
import { WalkForwardOptimizer } from './backtester/walkForward';
import { MonteCarloSimulator } from './backtester/monteCarlo';
import { Database } from './data/db';
import * as dotenv from 'dotenv';

dotenv.config();

const MAJOR_PAIRS = [
  'EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X',
  'USDCHF=X', 'USDCAD=X', 'NZDUSD=X'
];

async function main() {
  console.log('--- Institutional-Grade Forex Engine ---');

  // Initialize Database for persistence
  await Database.init().catch(e => console.warn('Postgres connection failed, using in-memory mode.'));

  const adaptiveModule = new AdaptiveModule();
  const scoringEngine = new ScoringEngine(adaptiveModule);
  const strategies = [new TrendFollowingStrategy(), new MeanReversionStrategy()];
  const loader = new YahooFinanceProvider();

  console.log('Loading multi-asset context (DXY, Gold, TNX)...');
  const context = await loader.loadMultiAssetContext();

  const walkForward = new WalkForwardOptimizer(strategies, scoringEngine, adaptiveModule);

  for (const symbol of MAJOR_PAIRS) {
    console.log(`\nAnalyzing ${symbol}...`);
    const candles = await loader.loadData(symbol, 90);

    if (candles.length < 500) {
      console.warn(`[${symbol}] Insufficient data.`);
      continue;
    }

    const results = await walkForward.runWalkForward(symbol, candles, context);

    console.log(`[${symbol}] OOS Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
    console.log(`[${symbol}] OOS Expectancy: ${results.expectancy.toFixed(3)}`);
    console.log(`[${symbol}] OOS Max Drawdown: ${results.maxDrawdown.toFixed(2)} R`);

    // Basic Monte Carlo for robustness check
    const simulator = new Backtester(strategies, scoringEngine, adaptiveModule);
    await simulator.run(symbol, candles, context);
    const outcomes = simulator.getOutcomes();
    const mc = MonteCarloSimulator.run(outcomes);
    console.log(`[${symbol}] Monte Carlo Stability Score: ${mc.stability.toFixed(2)}`);
  }
}

main().catch(console.error);
