import { OHLCV } from '../types';

export class Indicators {
  static ema(data: number[], period: number): number[] {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    let ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  }

  static atr(candles: OHLCV[], period: number): number[] {
    if (candles.length === 0) return [];
    const tr: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i++) {
      const h_l = candles[i].high - candles[i].low;
      const h_pc = Math.abs(candles[i].high - candles[i - 1].close);
      const l_pc = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(h_l, h_pc, l_pc));
    }

    const atr = [tr.slice(0, period).reduce((a, b) => a + b, 0) / Math.max(period, 1)];
    const k = 1 / period;
    for (let i = period; i < tr.length; i++) {
      atr.push(tr[i] * k + atr[atr.length - 1] * (1 - k));
    }
    const padding = new Array(Math.min(period - 1, tr.length)).fill(atr[0] || 0);
    return [...padding, ...atr];
  }

  static rsi(data: number[], period: number): number[] {
    if (data.length <= period) return new Array(data.length).fill(50);

    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Initial RSI calculation with division guard
    if (avgLoss === 0) {
      rsi.push(avgGain === 0 ? 50 : 100);
    } else {
      rsi.push(100 - 100 / (1 + avgGain / avgLoss));
    }

    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      let gain = diff >= 0 ? diff : 0;
      let loss = diff < 0 ? -diff : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      if (avgLoss === 0) {
        rsi.push(avgGain === 0 ? 50 : 100);
      } else {
        rsi.push(100 - 100 / (1 + avgGain / avgLoss));
      }
    }

    const padding = new Array(period).fill(50);
    return [...padding, ...rsi];
  }

  static emaSlope(ema: number[], lookback: number = 3): number {
    if (ema.length < lookback) return 0;
    const current = ema[ema.length - 1];
    const previous = ema[ema.length - lookback];
    return (current - previous) / lookback;
  }
}
