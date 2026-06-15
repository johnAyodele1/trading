# Forex Trade Intelligence Engine

A professional-grade quantitative trading signal engine built with TypeScript, featuring adaptive machine learning and probabilistic market regime detection.

## 🚀 Key Features

*   **Multi-Pair Intelligence**: Independent probabilistic models for all major pairs (EURUSD, USDJPY, etc.).
*   **Adaptive Learning**: Online learning using Stochastic Gradient Descent (SGD) to calibrate signal confidence based on historical performance.
*   **Probabilistic Regimes**: Softmax-based classification of market states (TREND, RANGE, LOW_VOLATILITY).
*   **Realistic Backtesting**: No look-ahead bias, execution on next-candle open, and full modeling of transaction costs (spread, commission, slippage).
*   **Persistence**: PostgreSQL integration for persisting ML model states and trade history.

## ⚙️ Setup & Configuration

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL (optional, defaults to in-memory mode if unavailable)

### Environment Variables
Create a `.env` file in the root directory. You can use `.env.example` as a template:
```env
ENGINE_MODE=BACKTEST  # Options: BACKTEST or LIVE
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/trading_engine
```

### Installation
```bash
npm install
```

## 📈 Running the System

### Backtest Mode
Runs a historical simulation over the last 60 days of hourly data for all major pairs, training the models sequentially.
```bash
npm start
```

### Live Signal Mode
Fetches the latest market data and outputs the highest-confidence trade setup currently available.
```bash
ENGINE_MODE=LIVE npm start
```

## 📊 Understanding the Output

*   **Win Rate**: Percentage of trades that hit Take Profit.
*   **Expectancy (R)**: The average profit per trade expressed in risk units. (e.g., 0.2 means on average every trade earns 20% of the amount risked).
*   **Max Drawdown (R)**: The largest peak-to-valley decline in the equity curve, expressed in risk units.
*   **Confidence Score**: A blend of model-predicted win probability (P(win|features)) and historical contextual evidence.

## 🏗️ Architecture
*   `src/core`: Technical indicators, feature extraction, and regime detection.
*   `src/engine`: Probabilistic scoring model and SGD logic.
*   `src/strategies`: Regime-aware signal generation logic.
*   `src/backtester`: Walk-forward simulation engine.
*   `src/learning`: Contextual performance tracking and recency-weighted stats.
*   `src/data`: API providers (Yahoo Finance, Binance) and Database layer.
