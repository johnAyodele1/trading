import { TrendFollowingStrategy, MeanReversionStrategy } from '../strategies/base';
import { ScoringEngine } from './scoring';
import { AdaptiveModule } from '../learning/adaptiveModule';
import { Backtester } from '../backtester/engine';
import { YahooFinanceProvider } from '../data/yahooFinanceProvider';
import { WalkForwardOptimizer } from '../backtester/walkForward';
import { MonteCarloSimulator } from '../backtester/monteCarlo';
import { Database } from '../data/db';

const MAJOR_PAIRS = [
  'EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X',
  'USDCHF=X', 'USDCAD=X', 'NZDUSD=X'
];

export interface AnalysisResult {
  symbol: string;
  winRate: number;
  expectancy: number;
  maxDrawdown: number;
  stabilityScore: number;
}

export async function runFullAnalysis(): Promise<AnalysisResult[]> {
  // Initialize Database for persistence
  await Database.init().catch((e: any) => console.warn('Postgres connection failed, using in-memory mode.'));

  const adaptiveModule = new AdaptiveModule();
  const scoringEngine = new ScoringEngine(adaptiveModule);
  const strategies = [new TrendFollowingStrategy(), new MeanReversionStrategy()];
  const loader = new YahooFinanceProvider();

  const context = await loader.loadMultiAssetContext();
  const walkForward = new WalkForwardOptimizer(strategies, scoringEngine, adaptiveModule);

  const finalResults: AnalysisResult[] = [];

  for (const symbol of MAJOR_PAIRS) {
    const candles = await loader.loadData(symbol, 90);

    if (candles.length < 500) {
      continue;
    }

    const results = await walkForward.runWalkForward(symbol, candles, context);

    // Basic Monte Carlo for robustness check
    const simulator = new Backtester(strategies, scoringEngine, adaptiveModule);
    await simulator.run(symbol, candles, context);
    const outcomes = simulator.getOutcomes();
    const mc = MonteCarloSimulator.run(outcomes);

    finalResults.push({
      symbol,
      winRate: results.winRate,
      expectancy: results.expectancy,
      maxDrawdown: results.maxDrawdown,
      stabilityScore: mc.stability
    });
  }

  return finalResults;
}
