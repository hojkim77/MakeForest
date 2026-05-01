import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys, setSession, getSession, addActiveDong, removeActiveDong, getDongActiveCount, addActiveRegion, removeActiveRegion } from '@makeforest/redis';
import { broadcastToRegion, buildRegionUsers } from './sse';
import { broadcastHeatmap } from './map';
import { regionOf } from '@makeforest/types';
import type { CreateSessionInput, SessionAction } from '@makeforest/types';

export const sessionsRouter = Router();

async function getDongRegionCode(dongCode: string): Promise<string> {
  const dong = await prisma.dong.findUnique({ where: { code: dongCode }, select: { name: true } });
  return dong ? regionOf(dongCode, dong.name) : dongCode.substring(0, 5);
}

// POST /sessions — 새 세션 시작
sessionsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { durationSec, dongCode, todos, userId } = req.body as CreateSessionInput & { userId: string };

    if (!userId || !dongCode) {
      return res.status(400).json({ error: 'userId and dongCode required' });
    }

    // 기존 RUNNING/PAUSED 세션 조회 → DB ABANDONED + Redis 정리
    const staleSessions = await prisma.focusSession.findMany({
      where: { userId, status: { in: ['RUNNING', 'PAUSED'] } },
      select: { id: true, dongCode: true },
    });

    if (staleSessions.length > 0) {
      await prisma.focusSession.updateMany({
        where: { userId, status: { in: ['RUNNING', 'PAUSED'] } },
        data: { status: 'ABANDONED', endedAt: new Date() },
      });

      // 비동기로 Redis 정리 (응답 블로킹 없음)
      void (async () => {
        try {
          for (const stale of staleSessions) {
            const rc = await getDongRegionCode(stale.dongCode);
            await removeActiveDong(stale.dongCode, stale.id);
            await removeActiveRegion(rc, stale.id);
          }
          // 히트맵 재계산 (영향받은 dongCode들만)
          const affectedDongs = [...new Set(staleSessions.map((s) => s.dongCode))];
          for (const dc of affectedDongs) {
            const cnt = await getDongActiveCount(dc);
            await redis.hset(RedisKeys.heatmapDong(), { [dc]: cnt });
          }
          const heatmapRaw = await redis.hgetall(RedisKeys.heatmapDong()) ?? {};
          const activity: Record<string, number> = {};
          for (const [code, cnt] of Object.entries(heatmapRaw)) activity[code] = Number(cnt);
          broadcastHeatmap(activity);
        } catch (err) {
          console.error('[sessions] stale session cleanup error:', err);
        }
      })();
    }

    const session = await prisma.focusSession.create({
      data: {
        userId,
        dongCode,
        durationSec,
        todos: todos as unknown as never,
        status: 'RUNNING',
      },
    });

    // 세션 생성 완료 — 응답을 먼저 확정
    const result = { sessionId: session.id, startedAt: session.startedAt };

    // Redis 캐싱 + SSE 브로드캐스트 (실패해도 세션 생성은 성공)
    void (async () => {
      try {
        await setSession(session.id, {
          userId,
          dongCode,
          startedAt: session.startedAt.toISOString(),
          durationSec,
          todos,
          status: 'RUNNING',
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

// PATCH /sessions/:id — 상태 변경
sessionsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { action } = req.body as { action: SessionAction };
    const id = String(req.params['id']);

    const statusMap: Record<SessionAction, 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED'> = {
      pause: 'PAUSED',
      resume: 'RUNNING',
      abandon: 'ABANDONED',
      complete: 'COMPLETED',
    };

    const newStatus = statusMap[action];
    const isPausing = action === 'pause';
    const isResuming = action === 'resume';
    const isEnding = action === 'abandon' || action === 'complete';
    const isChangingActive = isPausing || isResuming || isEnding;

    const session = await prisma.focusSession.update({
      where: { id },
      data: {
        status: newStatus,
        ...(isEnding ? { endedAt: new Date() } : {}),
      },
    });

    // Redis 동기화 + SSE 브로드캐스트 (실패해도 DB 상태 변경은 성공)
    void (async () => {
      try {
        if (isChangingActive) {
          const regionCode = await getDongRegionCode(session.dongCode);

          if (isPausing || isEnding) {
            await removeActiveDong(session.dongCode, id);
            await removeActiveRegion(regionCode, id);
          } else if (isResuming) {
            await addActiveDong(session.dongCode, id);
            await addActiveRegion(regionCode, id);
          }

          const activeCount = await getDongActiveCount(session.dongCode);
          await redis.hset(RedisKeys.heatmapDong(), { [session.dongCode]: activeCount });
          const heatmapRaw = await redis.hgetall(RedisKeys.heatmapDong()) ?? {};
          const activity: Record<string, number> = {};
          for (const [code, cnt] of Object.entries(heatmapRaw)) activity[code] = Number(cnt);
          broadcastHeatmap(activity);

          const users = await buildRegionUsers(regionCode);
          broadcastToRegion(regionCode, {
            type: 'dong:users',
            data: { regionCode, users },
          });
        }

        if (isPausing || isResuming) {
          const cached = await getSession(id);
          if (cached) await setSession(id, { ...cached, status: newStatus });
        }
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
