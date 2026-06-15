import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:3001/api/analysis');
      setResults(response.data);
    } catch (err) {
      setError('Failed to fetch analysis results. Make sure the server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  return (
    <div className="dashboard">
      <h1>Forex Intelligence Dashboard</h1>
      <div className="controls">
        <button onClick={fetchAnalysis} disabled={loading}>
          {loading ? 'Analyzing...' : 'Run New Analysis'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && <div className="loading">Processing market data... this may take a minute.</div>}

      {!loading && results.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Currency Pair</th>
                <th>Win Rate (%)</th>
                <th>Expectancy (R)</th>
                <th>Max Drawdown (R)</th>
                <th>Stability Score</th>
              </tr>
            </thead>
            <tbody>
              {results.map((res) => (
                <tr key={res.symbol}>
                  <td>{res.symbol}</td>
                  <td className={res.winRate > 0.5 ? 'positive' : 'negative'}>
                    {(res.winRate * 100).toFixed(2)}%
                  </td>
                  <td className={res.expectancy > 0 ? 'positive' : 'negative'}>
                    {res.expectancy.toFixed(3)}
                  </td>
                  <td>{res.maxDrawdown.toFixed(2)}</td>
                  <td>{res.stabilityScore.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
