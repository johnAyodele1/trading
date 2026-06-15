import { runFullAnalysis } from './engine/analysisService';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('--- Institutional-Grade Forex Engine ---');
  console.log('Loading multi-asset context (DXY, Gold, TNX)...');

  const results = await runFullAnalysis();

  for (const res of results) {
    console.log(`\nAnalyzing ${res.symbol}...`);
    console.log(`[${res.symbol}] OOS Win Rate: ${(res.winRate * 100).toFixed(2)}%`);
    console.log(`[${res.symbol}] OOS Expectancy: ${res.expectancy.toFixed(3)}`);
    console.log(`[${res.symbol}] OOS Max Drawdown: ${res.maxDrawdown.toFixed(2)} R`);
    console.log(`[${res.symbol}] Monte Carlo Stability Score: ${res.stabilityScore.toFixed(2)}`);
  }
}

main().catch(console.error);
