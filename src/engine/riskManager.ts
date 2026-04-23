import { Signal, MarketRegimeType } from '../types';

export interface PortfolioState {
  balance: number;
  openPositions: number;
  dailyPnL: number;
  currentEquity: number;
}

export class RiskManager {
  private maxSimultaneousPositions = 3;
  private maxDailyLossPct = 0.02; // 2% daily circuit breaker
  private riskPerTradePct = 0.01; // 1% default risk

  // Fractional Kelly Criterion (half-kelly for stability)
  calculatePositionSize(signal: Signal, portfolio: PortfolioState): number {
    const winRate = signal.historical_win_rate > 0 ? signal.historical_win_rate : 0.5;
    const rr = signal.risk_reward || 2;

    // Kelly Formula: f = (p*b - q) / b
    // where p=winRate, b=RR, q=1-p
    const kelly = (winRate * rr - (1 - winRate)) / rr;
    const safeKelly = Math.max(0, kelly * 0.5); // Half-kelly

    const size = portfolio.balance * Math.min(safeKelly, this.riskPerTradePct);
    return size;
  }

  canExecute(signal: Signal, portfolio: PortfolioState): { allowed: boolean; reason?: string } {
    if (portfolio.openPositions >= this.maxSimultaneousPositions) {
      return { allowed: false, reason: 'Max positions reached' };
    }

    if (portfolio.dailyPnL <= -(portfolio.balance * this.maxDailyLossPct)) {
      return { allowed: false, reason: 'Daily loss limit reached' };
    }

    // Regime specific filters
    if (signal.regime.primary === 'LOW_VOLATILITY') {
      return { allowed: false, reason: 'Insufficient volatility' };
    }

    // Correlation filter (Simplified: block if same bias as existing trades on same asset)
    // In a real system, this would check correlation matrix of open positions.

    return { allowed: true };
  }
}
