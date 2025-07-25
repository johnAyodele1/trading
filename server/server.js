const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { PORT, MONGODB_URI } = require('./config');
const Signal = require('./models/Signal');
const { calculateSignals } = require('./services/signalService');

const app = express();

app.use(express.json());

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

app.get('/api/signals', async (req, res) => {
  try {
    const signals = await Signal.find();
    res.json(signals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching signals', error });
  }
});

// Schedule cron job to run every 15 minutes
cron.schedule('*/15 * * * *', () => {
  console.log('Running signal calculation job...');
  calculateSignals();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
