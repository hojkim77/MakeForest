import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { broadcastToRegion, broadcastUsersOverlay } from './sse';
import { calcPersonalStage, getKstDateString } from './water.logic';
import { regionOf } from '@makeforest/types';
import { getSession, setSession, getActiveDongSessions } from '@makeforest/redis';

export const waterRouter = Router();

// POST /water — 물 주기
waterRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, dongCode, nickname } = req.body as {
      userId: string;
      dongCode: string;
      nickname: string;
    };

    if (!userId || !dongCode) {
      return res.status(400).json({ error: 'userId and dongCode required' });
    }

    const today = getKstDateString();

    // 오늘 세션 조회 (waterCount 확인용)
    const focusSession = await prisma.focusSession.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    // 일일 물주기 한도 (최대 12회)
    if ((focusSession?.waterCount ?? 0) >= 12) {
      return res.status(409).json({ error: '오늘 물주기 횟수를 모두 사용했습니다.' });
    }

    const dong = await prisma.dong.findUnique({ where: { code: dongCode }, select: { name: true } });
    const regionCode = dong ? regionOf(dongCode, dong.name) : dongCode.substring(0, 5);

    const newWaterCount = (focusSession?.waterCount ?? 0) + 1;

    // 물주기 기록 + UserCreature + FocusSession 업데이트 (트랜잭션)
    const [, userCreature] = await prisma.$transaction(async (tx) => {
      const log = await tx.wateringLog.create({
        data: { userId, dongCode, date: today },
      });

      const existing = await tx.userCreature.findUnique({ where: { userId } });
      const lifetimeCount = (existing?.waterCount ?? 0) + 1;
      const newStage = calcPersonalStage(lifetimeCount);

      const updated = await tx.userCreature.upsert({
        where: { userId },
        update: { waterCount: lifetimeCount, stage: newStage },
        create: { userId, waterCount: lifetimeCount, stage: newStage },
      });

      // FocusSession waterCount 증가 + totalElapsedSec 갱신
      await tx.focusSession.upsert({
        where: { userId_date: { userId, date: today } },
        update: {
          waterCount: { increment: 1 },
          totalElapsedSec: newWaterCount * 1800,
        },
        create: {
          userId,
          dongCode,
          date: today,
          waterCount: 1,
          totalElapsedSec: 1800,
          status: 'COMPLETED',
        },
      });

      return [log, updated];
    });

    // Redis 캐시 waterCount/creatureStage 업데이트
    void (async () => {
      try {
        const sessionIds = await getActiveDongSessions(dongCode);
        for (const sid of sessionIds) {
          const cached = await getSession(sid);
          if (cached?.userId === userId) {
            await setSession(sid, {
              ...cached,
              waterCount: userCreature.waterCount,
              todayWaterCount: newWaterCount,
              creatureStage: userCreature.stage,
              status: 'IDLE',
            }, 25 * 3600);
            break;
          }
        }
        broadcastUsersOverlay();
      } catch (err) {
        console.error('[water] Redis/SSE sync error:', err);
      }
    })();

    broadcastToRegion(regionCode, {
      type: 'water:toast',
      data: { dongCode, nickname: nickname ?? '누군가' },
    });

    return res.json({
      myWaterCount: newWaterCount,
      userCreature: { stage: userCreature.stage, waterCount: userCreature.waterCount },
    });
  } catch (err) {
    console.error('[water] POST error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /water/me?userId=...&date=...
waterRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const { userId, date } = req.query as { userId: string; date?: string };
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
