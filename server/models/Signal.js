const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
  asset: { type: String, required: true, unique: true },
  rsi: { type: Number },
  bb: { type: String },
  maTrend: { type: String },
  signal: { type: String },
  confidence: { type: Number },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Signal', signalSchema);
