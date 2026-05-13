import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys, setSession, getSession, addActiveDong, removeActiveDong, getDongActiveCount, addActiveRegion, removeActiveRegion } from '@makeforest/redis';
import { broadcastToRegion, buildRegionUsers } from './sse';
import { broadcastHeatmap } from './map';
import { regionOf } from '@makeforest/types';
import { getKstDateString } from './water.logic';
import type { SessionAction } from '@makeforest/types';

export const sessionsRouter = Router();

async function getDongRegionCode(dongCode: string): Promise<string> {
  const dong = await prisma.dong.findUnique({ where: { code: dongCode }, select: { name: true } });
  return dong ? regionOf(dongCode, dong.name) : dongCode.substring(0, 5);
}

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

    const result = { sessionId: session.id, startedAt: session.startedAt };

    // Redis 캐싱 + SSE 브로드캐스트
    void (async () => {
      try {
        const [user, dong, creature] = await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: { nickname: true, todosPublic: true },
          }),
          prisma.dong.findUnique({ where: { code: dongCode }, select: { lat: true, lng: true } }),
          prisma.userCreature.findUnique({
            where: { userId },
            select: { waterCount: true, stage: true },
          }),
        ]);

        const { toPixel } = await import('./map');
        const { pixelX, pixelY } = dong ? toPixel(dong.lat, dong.lng) : { pixelX: 0, pixelY: 0 };

        const cached = await getSession(session.id);
        await setSession(session.id, {
          userId,
          dongCode,
          startedAt: session.startedAt.toISOString(),
          todos: todos as never,
          status: 'RUNNING',
          nickname: cached?.nickname ?? user?.nickname ?? '누군가',
          pixelX: cached?.pixelX ?? pixelX,
          pixelY: cached?.pixelY ?? pixelY,
          waterCount: cached?.waterCount ?? creature?.waterCount ?? 0,
          creatureStage: cached?.creatureStage ?? creature?.stage ?? 0,
          todosPublic: user?.todosPublic ?? true,
        });

        await addActiveDong(dongCode, session.id);
        const regionCode = await getDongRegionCode(dongCode);
        await addActiveRegion(regionCode, session.id);

        const activeCount = await getDongActiveCount(dongCode);
        await redis.hset(RedisKeys.heatmapDong(), { [dongCode]: activeCount });
        const heatmapRaw = await redis.hgetall(RedisKeys.heatmapDong()) ?? {};
        const activity: Record<string, number> = {};
        for (const [code, cnt] of Object.entries(heatmapRaw)) activity[code] = Number(cnt);
        broadcastHeatmap(activity);

        const users = await buildRegionUsers(regionCode);
        broadcastToRegion(regionCode, { type: 'dong:users', data: { regionCode, users } });
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

    // 활성 세트에서 제거 + 히트맵 + SSE 브로드캐스트
    void (async () => {
      try {
        const regionCode = await getDongRegionCode(session.dongCode);
        await removeActiveDong(session.dongCode, id);
        await removeActiveRegion(regionCode, id);

        const activeCount = await getDongActiveCount(session.dongCode);
        await redis.hset(RedisKeys.heatmapDong(), { [session.dongCode]: activeCount });
        const heatmapRaw = await redis.hgetall(RedisKeys.heatmapDong()) ?? {};
        const activity: Record<string, number> = {};
        for (const [code, cnt] of Object.entries(heatmapRaw)) activity[code] = Number(cnt);
        broadcastHeatmap(activity);

        const users = await buildRegionUsers(regionCode);
        broadcastToRegion(regionCode, { type: 'dong:users', data: { regionCode, users } });
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
