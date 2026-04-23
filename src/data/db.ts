import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

export class Database {
  private static pool: Pool;

  static getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/trading_engine'
      });
    }
    return this.pool;
  }

  static async init() {
    const pool = this.getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS model_states (
        symbol VARCHAR(20) PRIMARY KEY,
        state JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trade_history (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        signal_id TEXT NOT NULL,
        outcome VARCHAR(10) NOT NULL,
        pnl NUMERIC NOT NULL,
        context JSONB NOT NULL,
        timestamp BIGINT NOT NULL
      );
    `);
  }

  static async saveModelState(symbol: string, state: any) {
    const pool = this.getPool();
    await pool.query(
      'INSERT INTO model_states (symbol, state, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (symbol) DO UPDATE SET state = $2, updated_at = CURRENT_TIMESTAMP',
      [symbol, state]
    );
  }

  static async loadModelState(symbol: string): Promise<any | null> {
    const pool = this.getPool();
    const res = await pool.query('SELECT state FROM model_states WHERE symbol = $1', [symbol]);
    return res.rows.length > 0 ? res.rows[0].state : null;
  }

  static async saveTrade(symbol: string, trade: any) {
    const pool = this.getPool();
    await pool.query(
      'INSERT INTO trade_history (symbol, signal_id, outcome, pnl, context, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
      [symbol, trade.signalId, trade.outcome, trade.pnl, trade.context, trade.exitTimestamp]
    );
  }
}
