import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [trades, setTrades] = useState([])
  const [metrics, setMetrics] = useState({ totalTrades: 0, winRate: 0, avgPnl: 0 })
  const [liveSignal, setLiveSignal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tradesRes, metricsRes, liveRes] = await Promise.all([
          fetch('http://localhost:3001/api/trades'),
          fetch('http://localhost:3001/api/metrics'),
          fetch('http://localhost:3001/api/live?symbol=EURUSD=X')
        ])

        const tradesData = await tradesRes.json()
        const metricsData = await metricsRes.json()
        const liveData = await liveRes.json()

        setTrades(Array.isArray(tradesData) ? tradesData : [])
        setMetrics(metricsData || { totalTrades: 0, winRate: 0, avgPnl: 0 })

        // liveData will be a single Signal object or null from the refactored server
        setLiveSignal(liveData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="loading">Loading Dashboard...</div>

  return (
    <div className="dashboard">
      <header>
        <h1>Institutional-Grade Forex Dashboard</h1>
      </header>

      {liveSignal ? (
        <section className="live-signal-box">
          <div className="signal-header">
            <h2>Latest Live Signal: {liveSignal.pair}</h2>
            <span className={`bias-badge ${liveSignal.bias}`}>
              {liveSignal.bias}
            </span>
          </div>
          <div className="signal-details">
            <div className="detail-item">
              <label>Entry</label>
              <span>{liveSignal.entry?.toFixed(5)}</span>
            </div>
            <div className="detail-item">
              <label>Stop Loss</label>
              <span>{liveSignal.stop_loss?.toFixed(5)}</span>
            </div>
            <div className="detail-item">
              <label>Take Profit</label>
              <span>{liveSignal.take_profit?.toFixed(5)}</span>
            </div>
            <div className="detail-item">
              <label>Lot Size</label>
              <span>{liveSignal.lot_size}</span>
            </div>
            <div className="detail-item">
              <label>Leverage</label>
              <span>{liveSignal.leverage}x</span>
            </div>
          </div>
          <div className="reasoning">
            <strong>Analysis:</strong> {liveSignal.reasoning}
          </div>
        </section>
      ) : (
        <section className="live-signal-box empty">
          <h2>No live signal currently available for EURUSD=X</h2>
          <p>The engine is scanning for high-probability setups...</p>
        </section>
      )}

      <section className="metrics-grid">
        <div className="metric-card">
          <h3>Total Trades</h3>
          <p className="value">{metrics?.totalTrades ?? 0}</p>
        </div>
        <div className="metric-card">
          <h3>Win Rate</h3>
          <p className="value">{((metrics?.winRate ?? 0) * 100).toFixed(1)}%</p>
        </div>
        <div className="metric-card">
          <h3>Avg PnL</h3>
          <p className={`value ${(metrics?.avgPnl ?? 0) >= 0 ? 'positive' : 'negative'}`}>
            {(metrics?.avgPnl ?? 0).toFixed(2)} R
          </p>
        </div>
      </section>

      <section className="trade-history">
        <h2>Recent Trade History</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Outcome</th>
                <th>PnL</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td>{trade.symbol}</td>
                  <td className={trade.outcome === 'WIN' ? 'positive' : 'negative'}>
                    {trade.outcome}
                  </td>
                  <td>{parseFloat(trade.pnl).toFixed(2)} R</td>
                  <td>{new Date(parseInt(trade.timestamp)).toLocaleString()}</td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr>
                  <td colSpan="4">No trades recorded yet. Run the engine to see data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default App
