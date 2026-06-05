import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { broadcastToRegion, broadcastUsersOverlay } from './sse';
import { calcPersonalStage, minutesUntilNextStage, getKstDateString } from './water.logic';
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

    const [, userCreature, newWaterCount, focusLengthMin, segmentCount] = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ waterCount: number; status: string; focusLengthMin: number | null; segmentCount: number | null }>>`
        SELECT "waterCount", status, "focusLengthMin", "segmentCount" FROM "FocusSession"
        WHERE "userId" = ${userId} AND "date" = ${today}
        FOR UPDATE
      `;
      const locked = rows[0] ?? null;

      const fLen = locked?.focusLengthMin ?? 30;
      const segs = locked?.segmentCount ?? 12;

      if ((locked?.waterCount ?? 0) >= segs) {
        throw Object.assign(new Error('daily limit'), { code: 'DAILY_WATER_LIMIT' });
      }

      const newCount = (locked?.waterCount ?? 0) + 1;
      const statusReset = locked?.status === 'COMPLETED' ? ({ status: 'IDLE' } as const) : {};

      const log = await tx.wateringLog.create({
        data: { userId, dongCode, date: today },
      });

      const existing = await tx.userCreature.findUnique({ where: { userId } });
      const prevFocusMinutes = existing?.totalFocusMinutes ?? (existing ? (existing.totalWaterCount * 30) : 0);
      const newTotalFocusMinutes = prevFocusMinutes + fLen;
      const newTotalWaterCount = Math.floor(newTotalFocusMinutes / 30);
      const newStage = calcPersonalStage(newTotalFocusMinutes);

      const updated = await tx.userCreature.upsert({
        where: { userId },
        update: {
          totalFocusMinutes: newTotalFocusMinutes,
          totalWaterCount: newTotalWaterCount,
          stage: newStage,
        },
        create: {
          userId,
          totalFocusMinutes: newTotalFocusMinutes,
          totalWaterCount: newTotalWaterCount,
          stage: newStage,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: 6 } },
      });

      await tx.focusSession.upsert({
        where: { userId_date: { userId, date: today } },
        update: {
          waterCount: newCount,
          totalElapsedSec: newCount * fLen * 60,
          ...statusReset,
        },
        create: {
          userId,
          dongCode,
          date: today,
          waterCount: 1,
          totalElapsedSec: fLen * 60,
          status: 'IDLE',
        },
      });

      return [log, updated, newCount, fLen, segs];
    });

    void (async () => {
      try {
        const userSessionId = await redis.get(RedisKeys.userSession(userId));
        if (userSessionId) {
          const cached = await getSession(userSessionId);
          if (cached) {
            await setSession(userSessionId, {
              ...cached,
              totalWaterCount: userCreature.totalWaterCount,
              totalFocusMinutes: userCreature.totalFocusMinutes,
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
      segmentCount,
      focusLengthMin,
      userCreature: {
        stage: userCreature.stage,
        totalWaterCount: userCreature.totalWaterCount,
        totalFocusMinutes: userCreature.totalFocusMinutes,
        minutesUntilNextStage: minutesUntilNextStage(userCreature.totalFocusMinutes),
      },
    });
  } catch (err) {
    if (err instanceof Error && (err as Error & { code?: string }).code === 'DAILY_WATER_LIMIT') {
      return res.status(409).json({ error: '오늘 물주기 횟수를 모두 사용했습니다.', code: 'DAILY_WATER_LIMIT' });
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
      select: { waterCount: true, focusLengthMin: true, segmentCount: true },
    });

    return res.json({
      waterCount: session?.waterCount ?? 0,
      date: today,
      focusLengthMin: session?.focusLengthMin ?? 30,
      segmentCount: session?.segmentCount ?? 12,
    });
  } catch (err) {
    console.error('[water] GET /me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
