import { OHLCV, PerformanceMetrics } from '../types';
import { Backtester } from './engine';

export class WalkForwardOptimizer {
  constructor(
    private strategies: any[],
    private scoringEngine: any,
    private adaptiveModule: any
  ) {}

  async runWalkForward(pair: string, candles: OHLCV[], multiAssetContext?: Record<string, OHLCV[]>): Promise<PerformanceMetrics> {
    const totalSize = candles.length;
    const trainSize = Math.floor(totalSize * 0.4);
    const valSize = Math.floor(totalSize * 0.2);
    const testSize = totalSize - trainSize - valSize;

    console.log(`\n--- Walk-Forward Analysis for ${pair} ---`);
    console.log(`Train: ${trainSize} | Validate: ${valSize} | Out-of-Sample: ${testSize}`);

    const backtester = new Backtester(this.strategies, this.scoringEngine, this.adaptiveModule);

    // 1. In-sample Phase (Train/Validate)
    const inSampleData = candles.slice(0, trainSize + valSize);
    await backtester.run(pair, inSampleData, multiAssetContext);

    // 2. Out-of-Sample Phase (Test)
    const outOfSampleData = candles.slice(trainSize + valSize);
    // Align context to outOfSampleData (Backtester handles slicing internally by timestamp usually, but here we pass full context)
    const results = await backtester.run(pair, outOfSampleData, multiAssetContext);

    return results;
  }
}
