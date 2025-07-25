const axios = require('axios');
const technicalindicators = require('technicalindicators');
const Signal = require('../models/Signal');
const { TWELVE_DATA_API_KEY } = require('../config');

const cryptoAssets = ['BTC/USD', 'ETH/USD', 'XRP/USD', 'SOL/USD', 'ADA/USD'];
const forexAssets = ['EUR/USD', 'GBP/USD', 'USD/JPY'];

const calculateRSI = (closes) => {
  const rsi = new technicalindicators.RSI({ period: 14, values: closes });
  const results = rsi.getResult();
  return results.length > 0 ? results[results.length - 1] : null;
};

const calculateBollingerBands = (closes) => {
  const bb = new technicalindicators.BollingerBands({ period: 20, stdDev: 2, values: closes });
  const results = bb.getResult();
  return results.length > 0 ? results[results.length - 1] : null;
};

const calculateSMA = (closes, period) => {
  const sma = new technicalindicators.SMA({ period, values: closes });
  const results = sma.getResult();
  return results.length > 0 ? results[results.length - 1] : null;
};

const calculateEMA = (closes, period) => {
  const ema = new technicalindicators.EMA({ period, values: closes });
  const results = ema.getResult();
  return results.length > 0 ? results[results.length - 1] : null;
};

const getCryptoData = async (symbol) => {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${symbol.split('/')[0].toLowerCase()}/market_chart`, {
        params: {
            vs_currency: 'usd',
            days: '90',
            interval: 'daily'
        }
    });
    return response.data.prices.map(p => p[1]);
};

const getForexData = async (symbol) => {
    const response = await axios.get(`https://api.twelvedata.com/time_series`, {
        params: {
            symbol: symbol,
            interval: '1day',
            outputsize: 90,
            apikey: TWELVE_DATA_API_KEY
        }
    });
    return response.data.values.map(v => parseFloat(v.close));
};

const analyzeData = (closes) => {
    const rsi = calculateRSI(closes);
    const bb = calculateBollingerBands(closes);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    const currentPrice = closes[closes.length - 1];

    let signal = 'Neutral';
    let confidence = 0.5;

    // RSI
    if (rsi > 70) {
        signal = 'Short';
        confidence += 0.1;
    } else if (rsi < 30) {
        signal = 'Buy';
        confidence += 0.1;
    }

    // Bollinger Bands
    let bbPosition = 'inside_bands';
    if (bb) {
        if (currentPrice > bb.upper) {
            signal = signal === 'Buy' ? 'Neutral' : 'Short';
            confidence += 0.1;
            bbPosition = 'above_upper_band';
        } else if (currentPrice < bb.lower) {
            signal = signal === 'Short' ? 'Neutral' : 'Buy';
            confidence += 0.1;
            bbPosition = 'below_lower_band';
        }
    }


    // MA Trend
    let maTrend = 'flat';
    if (sma50 && sma200 && ema50 && ema200) {
        if (sma50 > sma200 && ema50 > ema200) {
            maTrend = 'golden_cross';
            if (signal !== 'Short') {
                signal = 'Buy';
                confidence += 0.1;
            }
        } else if (sma50 < sma200 && ema50 < ema200) {
            maTrend = 'death_cross';
            if (signal !== 'Buy') {
                signal = 'Short';
                confidence += 0.1;
            }
        }
    }


    return {
        rsi,
        bb: bbPosition,
        maTrend,
        signal,
        confidence: Math.min(1, confidence),
    };
};

const calculateSignals = async () => {
  console.log('Calculating signals...');
  for (const asset of [...cryptoAssets, ...forexAssets]) {
    try {
      let closes;
      if (cryptoAssets.includes(asset)) {
        closes = await getCryptoData(asset);
      } else {
        closes = await getForexData(asset);
      }

      if (closes && closes.length > 0) {
        const analysis = analyzeData(closes);
        await Signal.findOneAndUpdate(
          { asset },
          { ...analysis, lastUpdated: new Date() },
          { upsert: true, new: true }
        );
        console.log(`Signal for ${asset} updated.`);
      }
    } catch (error) {
      console.error(`Failed to calculate signal for ${asset}:`, error.message);
    }
  }
};

module.exports = { calculateSignals };
