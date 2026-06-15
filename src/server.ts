import express from 'express';
import cors from 'cors';
import { runFullAnalysis } from './engine/analysisService';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/analysis', async (req, res) => {
  try {
    console.log('Running analysis...');
    const results = await runFullAnalysis();
    res.json(results);
  } catch (error) {
    console.error('Analysis failed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
