import express from 'express';
import cors from 'cors';
import { sseRouter } from './routes/sse';
import { sessionsRouter } from './routes/sessions';
import { harvestRouter } from './routes/harvest';
import { mapRouter } from './routes/map';
import { waterRouter } from './routes/water';
import { creatureRouter } from './routes/creature';
import { statsRouter } from './routes/stats';
import { registerCronJobs } from './cron/midnight';
import { requireInternalAuth } from './middleware/auth';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Public: SSE streams and read-only data
app.use('/sse', sseRouter);
app.use('/map', mapRouter);
app.use('/creature', creatureRouter);

// Public: stats (read-only)
app.use('/stats', statsRouter);

// Internal: require Next.js-issued secret on mutating routes
app.use('/sessions', requireInternalAuth, sessionsRouter);
app.use('/harvest', requireInternalAuth, harvestRouter);
app.use('/water', requireInternalAuth, waterRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

registerCronJobs();

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
