import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { broadcastToRegion, broadcastUsersOverlay } from './sse';
import { calcPersonalStage, getKstDateString } from './water.logic';
import { regionOf, WaterBody, WaterMeQuery } from '@makeforest/types';
import { redis, RedisKeys, getSession, setSession } from '@makeforest/redis';
import { getDongFullName } from '../dongCache';

export const waterRouter = Router();

// POST /water — 물 주기
waterRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, dongCode, nickname } = WaterBody.parse(req.body);

    const today = getKstDateString();

    const dongName = await getDongFullName(dongCode);
    const regionCode = dongName ? regionOf(dongCode, dongName) : dongCode.substring(0, 5);

    // 물주기 기록 + UserCreature + FocusSession 업데이트 (트랜잭션)
    const [, userCreature, newWaterCount] = await prisma.$transaction(async (tx) => {
      // Row-level lock: prevents concurrent requests from all passing the waterCount < 12 check
      const rows = await tx.$queryRaw<Array<{ waterCount: number; status: string }>>`
        SELECT "waterCount", status FROM "FocusSession"
        WHERE "userId" = ${userId} AND "date" = ${today}
        FOR UPDATE
      `;
      const locked = rows[0] ?? null;

      if ((locked?.waterCount ?? 0) >= 12) {
        throw Object.assign(new Error('daily limit'), { code: 'DAILY_LIMIT' });
      }

      const newCount = (locked?.waterCount ?? 0) + 1;
      const statusReset = locked?.status === 'COMPLETED' ? ({ status: 'IDLE' } as const) : {};

      const log = await tx.wateringLog.create({
        data: { userId, dongCode, date: today },
      });

      const existing = await tx.userCreature.findUnique({ where: { userId } });
      const lifetimeCount = (existing?.totalWaterCount ?? 0) + 1;
      const newStage = calcPersonalStage(lifetimeCount);

      const updated = await tx.userCreature.upsert({
        where: { userId },
        update: { totalWaterCount: lifetimeCount, stage: newStage },
        create: { userId, totalWaterCount: lifetimeCount, stage: newStage },
      });

      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: 6 } },
      });

      await tx.focusSession.upsert({
        where: { userId_date: { userId, date: today } },
        update: {
          waterCount: newCount,
          totalElapsedSec: newCount * 1800,
          ...statusReset,
        },
        create: {
          userId,
          dongCode,
          date: today,
          waterCount: 1,
          totalElapsedSec: 1800,
          status: 'IDLE',
        },
      });

      return [log, updated, newCount];
    });

    // Redis 캐시 waterCount/creatureStage 업데이트 + collection increment + SSE broadcast
    void (async () => {
      try {
        const userSessionId = await redis.get(RedisKeys.userSession(userId));
        if (userSessionId) {
          const cached = await getSession(userSessionId);
          if (cached) {
            await setSession(userSessionId, {
              ...cached,
              totalWaterCount: userCreature.totalWaterCount,
              todayWaterCount: newWaterCount,
              creatureStage: userCreature.stage,
              status: 'IDLE',
            });
          }
        }
        broadcastUsersOverlay();

        broadcastToRegion(regionCode, {
          type: 'water:toast',
          data: { dongCode, nickname: nickname ?? '누군가' },
        });
      } catch (err) {
        console.error('[water] Redis/SSE sync error:', err);
      }
    })();

    return res.json({
      myWaterCount: newWaterCount,
      userCreature: { stage: userCreature.stage, totalWaterCount: userCreature.totalWaterCount },
    });
  } catch (err) {
    if (err instanceof Error && (err as Error & { code?: string }).code === 'DAILY_LIMIT') {
      return res.status(409).json({ error: '오늘 물주기 횟수를 모두 사용했습니다.' });
    }
    console.error('[water] POST error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /water/me?userId=...&date=...
waterRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const { userId, date } = WaterMeQuery.parse(req.query);
    const today = date ?? getKstDateString();

    const session = await prisma.focusSession.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    return res.json({ waterCount: session?.waterCount ?? 0, date: today });
  } catch (err) {
    console.error('[water] GET /me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
