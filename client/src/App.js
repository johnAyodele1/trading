import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [signals, setSignals] = useState([]);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // In a real app, this would fetch from the server.
    // For this demo, we'll simulate a signal stream.
    const mockSignals = [
      {
        pair: "EUR/USD",
        bias: "BUY",
        entry: 1.0850,
        stop_loss: 1.0820,
        take_profit: 1.0910,
        confidence_score: 82,
        regime: "TREND",
        reasoning: "Strong bullish EMA slope with RSI confirmation."
      },
      {
        pair: "GBP/USD",
        bias: "SELL",
        entry: 1.2650,
        stop_loss: 1.2680,
        take_profit: 1.2590,
        confidence_score: 65,
        regime: "RANGE",
        reasoning: "Mean reversion at range high."
      }
    ];
    setSignals(mockSignals);
    setMetrics({
      winRate: 0.62,
      profitFactor: 1.85,
      totalTrades: 142
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Forex Intelligence Engine</h1>
      </header>
      <main>
        <section className="metrics">
          <h2>Performance Metrics</h2>
          {metrics && (
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Win Rate</h3>
                <p>{(metrics.winRate * 100).toFixed(1)}%</p>
              </div>
              <div className="metric-card">
                <h3>Profit Factor</h3>
                <p>{metrics.profitFactor}</p>
              </div>
              <div className="metric-card">
                <h3>Total Trades</h3>
                <p>{metrics.totalTrades}</p>
              </div>
            </div>
          )}
        </section>

        <section className="signals">
          <h2>Latest Trading Signals</h2>
          <div className="signals-list">
            {signals.map((sig, i) => (
              <div key={i} className={`signal-card ${sig.bias.toLowerCase()}`}>
                <div className="signal-header">
                  <h3>{sig.pair}</h3>
                  <span className="bias">{sig.bias}</span>
                </div>
                <div className="signal-body">
                  <p><strong>Entry:</strong> {sig.entry}</p>
                  <p><strong>SL:</strong> {sig.stop_loss}</p>
                  <p><strong>TP:</strong> {sig.take_profit}</p>
                  <p><strong>Confidence:</strong> {sig.confidence_score}%</p>
                  <p><strong>Regime:</strong> {sig.regime}</p>
                </div>
                <div className="signal-reasoning">
                  <p>{sig.reasoning}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
