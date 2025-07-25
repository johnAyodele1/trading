import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SignalCard from './SignalCard';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const response = await axios.get('/api/signals');
        setSignals(response.data);
      } catch (error) {
        console.error('Error fetching signals', error);
      }
    };

    fetchSignals();
    const interval = setInterval(fetchSignals, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.dashboard}>
      <h1>Trading Signals</h1>
      <div className={styles.signalsGrid}>
        {signals.map((signal) => (
          <SignalCard key={signal.asset} signal={signal} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
