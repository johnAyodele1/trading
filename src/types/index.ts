export type MarketRegime = 'TREND' | 'RANGE' | 'LOW_VOLATILITY';
export type Bias = 'BUY' | 'SELL';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketData {
  pair: string;
  timeframe: string;
  candles: OHLCV[];
}

export interface Signal {
  pair: string;
  bias: Bias;
  entry: number;
  stop_loss: number;
  take_profit: number;
  risk_reward: number;
  confidence_score: number;
  historical_win_rate: number;
  regime: MarketRegime;
  confluences: string[];
  reasoning: string;
  invalidation_reason: string;
  timestamp: number;
  features: Record<string, number>;
}

export interface TradeOutcome {
  signalId: string;
  outcome: 'WIN' | 'LOSS';
  pnl: number;
  exitPrice: number;
  exitTimestamp: number;
  heldDuration: number;
}

export interface FeatureWeights {
  [featureName: string]: number;
}

export interface PerformanceMetrics {
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  expectancy: number;
  totalTrades: number;
}
