import express from 'express';
import cors from 'cors';
import { sseRouter } from './routes/sse';
import { sessionsRouter } from './routes/sessions';
import { harvestRouter } from './routes/harvest';
import { mapRouter } from './routes/map';
import { registerCronJobs } from './cron/midnight';
import { requireInternalAuth } from './middleware/auth';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Public: SSE streams and read-only map data
app.use('/sse', sseRouter);
app.use('/map', mapRouter);

// Internal: require Next.js-issued secret on mutating routes
app.use('/sessions', requireInternalAuth, sessionsRouter);
app.use('/harvest', requireInternalAuth, harvestRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

registerCronJobs();

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
