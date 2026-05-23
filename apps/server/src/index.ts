import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { sseRouter } from './routes/sse';
import { sessionsRouter } from './routes/sessions';
import { mapRouter } from './routes/map';
import { waterRouter } from './routes/water';
import { creatureRouter } from './routes/creature';
import { statsRouter } from './routes/stats';
import { userRouter } from './routes/user';
import { collectionRouter } from './routes/collection';
import { communityRouter } from './routes/community';
import { rankingRouter } from './routes/ranking';
import { guideRouter } from './routes/guide';
import { registerCronJobs } from './cron/midnight';
import { requireInternalAuth } from './middleware/auth';
import { testRouter } from './routes/test';

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
app.use('/user', userRouter);
app.use('/collection', collectionRouter);
app.use('/community', communityRouter);
app.use('/ranking', rankingRouter);

// Internal: require Next.js-issued secret on mutating routes
app.use('/sessions', requireInternalAuth, sessionsRouter);
app.use('/water', requireInternalAuth, waterRouter);
app.use('/guide', requireInternalAuth, guideRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid request' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// 부하 테스트 전용 엔드포인트 — test 환경 또는 LOAD_TEST=1 시 노출
if (process.env.NODE_ENV === 'test' || process.env.LOAD_TEST === '1') {
  app.use('/test', testRouter);
}

registerCronJobs();

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
