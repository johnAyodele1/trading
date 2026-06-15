import express from 'express';
import cors from 'cors';
import { Database } from './data/db';
import { YahooFinanceProvider } from './data/yahooFinanceProvider';
import { TrendFollowingStrategy, MeanReversionStrategy } from './strategies/base';
import { ScoringEngine } from './engine/scoring';
import { AdaptiveModule } from './learning/adaptiveModule';
import { LiveEngine } from './live';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Global engine instances
const loader = new YahooFinanceProvider();
const adaptiveModule = new AdaptiveModule();
const scoringEngine = new ScoringEngine(adaptiveModule);
const strategies = [new TrendFollowingStrategy(), new MeanReversionStrategy()];
const liveEngine = new LiveEngine(strategies, scoringEngine);

app.use(cors());
app.use(express.json());

app.get('/api/trades', async (req, res) => {
  try {
    const pool = Database.getPool();
    const result = await pool.query('SELECT * FROM trade_history ORDER BY timestamp DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

app.get('/api/live', async (req, res) => {
  try {
    const symbol = req.query.symbol as string || 'EURUSD=X';
    const candles = await loader.loadData(symbol, 5);

    const signal = liveEngine.generateLiveSignal(candles);
    res.json(signal);
  } catch (error) {
    console.error('Error generating live signal:', error);
    res.status(500).json({ error: 'Failed to generate live signal' });
  }
});

app.get('/api/metrics', async (req, res) => {
  try {
    const pool = Database.getPool();
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE outcome = 'WIN') as wins,
        AVG(pnl::numeric) as avg_pnl
      FROM trade_history
    `);

    const stats = result.rows[0];
    const total = parseInt(stats.total_trades);
    const wins = parseInt(stats.wins);
    const winRate = total > 0 ? (wins / total) : 0;

    res.json({
      totalTrades: total,
      winRate: winRate,
      avgPnl: parseFloat(stats.avg_pnl) || 0
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
