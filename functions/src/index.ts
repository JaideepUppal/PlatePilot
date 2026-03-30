import cors from 'cors';
import express from 'express';

import { aiRouter } from './routes/ai';
import { placesRouter } from './routes/places';
import { recipesRouter } from './routes/recipes';
import { visionRouter } from './routes/vision';
import { errorHandler, sendJsonError } from './utils/http';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '12mb' }));

app.get('/', (_req, res) => {
  res.status(200).send('PlatePilot backend running');
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/vision', visionRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/places', placesRouter);

app.use((_req, res) => {
  sendJsonError(res, 404, 'Route not found.');
});

app.use(errorHandler);

export { app };
