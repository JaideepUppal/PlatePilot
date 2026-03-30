import cors from 'cors';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';

import { aiRouter } from './routes/ai';
import { placesRouter } from './routes/places';
import { recipesRouter } from './routes/recipes';
import { visionRouter } from './routes/vision';
import { errorHandler, sendJsonError } from './utils/http';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '12mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/vision', visionRouter);
app.use('/recipes', recipesRouter);
app.use('/ai', aiRouter);
app.use('/places', placesRouter);

app.use((_req, res) => {
  sendJsonError(res, 404, 'Route not found.');
});

app.use(errorHandler);

export const api = onRequest(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  app,
);
