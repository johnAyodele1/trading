import React from 'react';
import { Line } from 'react-chartjs-2';
import styles from './SignalCard.module.css';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);


const SignalCard = ({ signal }) => {
    const { asset, rsi, bb, maTrend, signal: signalType, confidence, lastUpdated } = signal;

    const getSignalColor = () => {
        if (signalType.toLowerCase().includes('buy')) return styles.buy;
        if (signalType.toLowerCase().includes('short')) return styles.short;
        return styles.neutral;
    };

    const chartData = {
        labels: ['-2', '-1', 'Current'],
        datasets: [
            {
                label: 'RSI',
                data: [rsi, rsi, rsi], // Dummy data for chart
                borderColor: '#8884d8',
                fill: false,
            },
        ],
    };

    return (
        <div className={`${styles.signalCard} ${getSignalColor()}`}>
            <div className={styles.header}>
                <h2>{asset}</h2>
                <span className={styles.confidence}>{(confidence * 100).toFixed(0)}%</span>
            </div>
            <div className={styles.body}>
                <p><strong>Signal:</strong> {signalType}</p>
                <p><strong>RSI (14):</strong> {rsi ? rsi.toFixed(2) : 'N/A'}</p>
                <p><strong>Bollinger Bands:</strong> {bb}</p>
                <p><strong>MA Trend:</strong> {maTrend}</p>
            </div>
            <div className={styles.chart}>
                <Line data={chartData} />
            </div>
            <div className={styles.footer}>
                <p>Last Updated: {new Date(lastUpdated).toLocaleTimeString()}</p>
            </div>
        </div>
    );
};

export default SignalCard;
