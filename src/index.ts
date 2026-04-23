import { TrendFollowingStrategy, MeanReversionStrategy } from './strategies/base';
import { ScoringEngine } from './engine/scoring';
import { AdaptiveModule } from './learning/adaptiveModule';
import { Backtester } from './backtester/engine';
import { YahooFinanceProvider } from './data/yahooFinanceProvider';
import { LiveEngine } from './live';
import { Database } from './data/db';
import * as dotenv from 'dotenv';

dotenv.config();

const MAJOR_PAIRS = [
  'EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X',
  'USDCHF=X', 'USDCAD=X', 'NZDUSD=X'
];

async function main() {
  const mode = process.env.ENGINE_MODE || 'BACKTEST';
  console.log(`--- Forex Intelligence Engine (Mode: ${mode}) ---`);

  await Database.init().catch(e => console.warn('Postgres connection failed, using in-memory mode.'));

  const adaptiveModule = new AdaptiveModule();
  const scoringEngine = new ScoringEngine(adaptiveModule);
  await scoringEngine.initialize(MAJOR_PAIRS);

  const strategies = [new TrendFollowingStrategy(), new MeanReversionStrategy()];
  const loader = new YahooFinanceProvider();

  for (const symbol of MAJOR_PAIRS) {
    console.log(`\nProcessing ${symbol}...`);

    try {
      const candles = await loader.loadData(symbol);

      if (mode === 'BACKTEST') {
        const backtester = new Backtester(strategies, scoringEngine, adaptiveModule);
        // Correctly await the async backtester run
        const results = await backtester.run(symbol, candles);

        console.log(`[${symbol}] Backtest Results:`);
        console.log(` - Win Rate: ${(results.winRate * 100).toFixed(2)}%`);
        console.log(` - Expectancy: ${results.expectancy.toFixed(5)}`);
        console.log(` - Total Trades: ${results.totalTrades}`);
      } else {
        const live = new LiveEngine(strategies, scoringEngine);
        const signal = live.generateLiveSignal(candles);

        if (signal) {
          console.log(`[${symbol}] LIVE SIGNAL: ${signal.bias} @ ${signal.entry} (Confidence: ${signal.confidence_score}%)`);
        } else {
          console.log(`[${symbol}] No signal.`);
        }
      }
    } catch (err) {
      console.error(`Failed to process ${symbol}:`, (err as Error).message);
    }
  }
}

main().catch(console.error);
