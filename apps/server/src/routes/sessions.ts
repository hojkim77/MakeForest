import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys, setSession, getSession, addActiveDong, getDongActiveCount, addDailyOverlaySession } from '@makeforest/redis';
import { broadcastHeatmap, broadcastToRegion, broadcastUsersOverlay } from './sse';
import { getKstDateString } from './water.logic';
import { regionOf } from '@makeforest/types';
import { incrementCollection } from './collection';
import type { SessionAction } from '@makeforest/types';
import { getDongCoords, getDongFullName, getDongShortName } from '../dongCache';

export const sessionsRouter = Router();

// POST /sessions — 세션 시작 또는 재개 (하루 1개 upsert)
sessionsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { dongCode, todos, userId } = req.body as { dongCode: string; todos: unknown[]; userId: string };

    if (!userId || !dongCode) {
      return res.status(400).json({ error: 'userId and dongCode required' });
    }

    const today = getKstDateString();

    // 하루 1개 세션: startedAt 갱신 + status=RUNNING (재개 시에도 동일)
    const session = await prisma.focusSession.upsert({
      where: { userId_date: { userId, date: today } },
      update: {
        startedAt: new Date(),
        status: 'RUNNING',
        dongCode,
        todos: todos as unknown as never,
      },
      create: {
        userId,
        dongCode,
        date: today,
        todos: todos as unknown as never,
        status: 'RUNNING',
      },
    });

    // create 시: createdAt ≈ startedAt → 차이 < 2s
    // update 시: startedAt = now(), createdAt = 최초 생성 시각 → 차이 큼
    const isNewSession = Math.abs(session.createdAt.getTime() - session.startedAt.getTime()) < 2000;

    const result = { sessionId: session.id, startedAt: session.startedAt, isNewSession };

    // Redis 캐싱 + SSE 브로드캐스트
    void (async () => {
      try {
        const cached = await getSession(session.id);
        if (cached) {
          // 이미 캐시 있음 — startedAt과 status만 갱신
          await setSession(session.id, { ...cached, startedAt: session.startedAt.toISOString(), status: 'RUNNING' });
        } else {
          // 신규 세션 — 전체 초기화
          const [user, dongCoords, creature] = await Promise.all([
            prisma.user.findUnique({
              where: { id: userId },
              select: { nickname: true, todosPublic: true },
            }),
            getDongCoords(dongCode),
            prisma.userCreature.findUnique({
              where: { userId },
              select: { totalWaterCount: true, stage: true },
            }),
          ]);
          const { toPixel } = await import('./map');
          const { pixelX, pixelY } = dongCoords ? toPixel(dongCoords.lat, dongCoords.lng) : { pixelX: 0, pixelY: 0 };
          await setSession(session.id, {
            userId,
            dongCode,
            startedAt: session.startedAt.toISOString(),
            todos: todos as never,
            status: 'RUNNING',
            nickname: user?.nickname ?? '누군가',
            pixelX,
            pixelY,
            totalWaterCount: creature?.totalWaterCount ?? 0,
            todayWaterCount: session.waterCount ?? 0,
            creatureStage: creature?.stage ?? 0,
            todosPublic: user?.todosPublic ?? true,
          });
        }

        await addActiveDong(dongCode, session.id);
        await addDailyOverlaySession(today, session.id);

        const activeCount = await getDongActiveCount(dongCode);
        await redis.hset(RedisKeys.heatmapDong(), { [dongCode]: activeCount });
        const heatmapRaw = await redis.hgetall(RedisKeys.heatmapDong()) ?? {};
        const activity: Record<string, number> = {};
        for (const [code, cnt] of Object.entries(heatmapRaw)) activity[code] = Number(cnt);
        broadcastHeatmap(activity);
        broadcastUsersOverlay();

        // 첫 세션 시작 → 미션 기여 + session:toast 브로드캐스트 + 커뮤니티 포스트 자동 생성
        if (isNewSession) {
          const [dongFullName, cached] = await Promise.all([
            getDongFullName(dongCode),
            getSession(session.id),
          ]);
          const regionCode = dongFullName ? regionOf(dongCode, dongFullName) : dongCode.substring(0, 5);
          const nickname = cached?.nickname ?? '누군가';
          const dongName = await getDongShortName(dongCode);
          const [collectionProgress] = await Promise.all([
            incrementCollection(regionCode, today),
            prisma.communityPost.create({ data: { userId, sessionId: session.id, date: today, dongName, regionCode } }),
          ]);
          broadcastToRegion(regionCode, {
            type: 'session:toast',
            data: { dongCode, nickname, collectionProgress },
          });
        }
      } catch (err) {
        console.error('[sessions] Redis/SSE sync error:', err);
      }
    })();

    return res.json(result);
  } catch (err) {
    console.error('[sessions] POST error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /sessions/:id/todos — 할일 목록 업데이트
sessionsRouter.patch('/:id/todos', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    const { todos } = req.body as { todos: unknown[] };

    await prisma.focusSession.update({
      where: { id },
      data: { todos: todos as unknown as never },
    });

    // Redis 캐시 갱신
    const cached = await getSession(id);
    if (cached) {
      await setSession(id, { ...cached, todos: todos as never });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[sessions] PATCH /todos error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sessions/today — 오늘 세션 조회 (userId query param)
sessionsRouter.get('/today', async (req: Request, res: Response) => {
  const userId = String(req.query['userId'] ?? '');
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const today = getKstDateString();
  const session = await prisma.focusSession.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  if (!session) return res.status(404).json({ error: 'Not found' });
  return res.json(session);
});

// GET /sessions/:id
sessionsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params['id']);
  const session = await prisma.focusSession.findUnique({ where: { id } });
  if (!session) return res.status(404).json({ error: 'Not found' });
  return res.json(session);
});

// PATCH /sessions/:id — complete(30분 완료) | abandon(강제 종료)
sessionsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { action } = req.body as { action: SessionAction };
    const id = String(req.params['id']);

    if (!['complete', 'abandon'].includes(action)) {
      return res.status(400).json({ error: 'invalid action' });
    }

    const newStatus = action === 'complete' ? 'COMPLETED' : 'ABANDONED';

    const session = await prisma.focusSession.update({
      where: { id },
      data: { status: newStatus },
    });

    // Redis cache status 업데이트 + SSE 브로드캐스트
    void (async () => {
      try {
        const cached = await getSession(id);
        if (cached) {
          if (action === 'complete') {
            await setSession(id, { ...cached, status: 'COMPLETED' });
          } else {
            await setSession(id, { ...cached, status: 'ABANDONED' });
          }
        }
        broadcastUsersOverlay();
      } catch (err) {
        console.error('[sessions] Redis/SSE sync error:', err);
      }
    })();

    return res.json(session);
  } catch (err) {
    console.error('[sessions] PATCH error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
