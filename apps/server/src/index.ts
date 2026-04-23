import express from 'express';
import cors from 'cors';
import { sseRouter } from './routes/sse';
import { sessionsRouter } from './routes/sessions';
import { harvestRouter } from './routes/harvest';
import { mapRouter } from './routes/map';
import { registerCronJobs } from './cron/midnight';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/sse', sseRouter);
app.use('/sessions', sessionsRouter);
app.use('/harvest', harvestRouter);
app.use('/map', mapRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

registerCronJobs();

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
