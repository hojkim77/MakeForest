import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { broadcastToRegion } from './sse';
import { scheduleUsersOverlayBroadcast } from './map';
import { calcPersonalStage, getKstDateString, checkDailyCapExceeded } from './water.logic';
import { regionOf } from '@makeforest/types';
import { getSession, setSession, getActiveDongSessions } from '@makeforest/redis';

export const waterRouter = Router();

// POST /water — 물 주기
waterRouter.post('/', async (req: Request, res: Response) => {
  const { userId, dongCode, nickname, totalElapsedSec } = req.body as {
    userId: string;
    dongCode: string;
    nickname: string;
    totalElapsedSec?: number;
  };

  if (!userId || !dongCode) {
    return res.status(400).json({ error: 'userId and dongCode required' });
  }

  const today = getKstDateString();

  // 클라이언트가 계산한 누적 집중 시간(myWaterCount*1800 + elapsedSec)으로 6시간 캡 검사
  const effectiveElapsedSec = totalElapsedSec ?? 0;
  if (checkDailyCapExceeded(effectiveElapsedSec)) {
    return res.status(409).json({ error: '오늘 최대 집중 시간에 도달했습니다.' });
  }

  const daily = await prisma.dailySession.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  // 일일 물주기 한도 (최대 12회)
  if ((daily?.waterCount ?? 0) >= 12) {
    return res.status(409).json({ error: '오늘 물주기 횟수를 모두 사용했습니다.' });
  }

  // dong name 조회 → regionCode 계산
  const dong = await prisma.dong.findUnique({ where: { code: dongCode }, select: { name: true } });
  const regionCode = dong ? regionOf(dongCode, dong.name) : dongCode.substring(0, 5);

  // 물주기 기록 생성 + UserCreature 업데이트 (트랜잭션)
  const [, userCreature] = await prisma.$transaction(async (tx) => {
    const log = await tx.wateringLog.create({
      data: { userId, dongCode, date: today },
    });

    const existing = await tx.userCreature.findUnique({ where: { userId } });
    const newWaterCount = (existing?.waterCount ?? 0) + 1;
    const newStage = calcPersonalStage(newWaterCount);

    const updated = await tx.userCreature.upsert({
      where: { userId },
      update: { waterCount: newWaterCount, stage: newStage },
      create: { userId, waterCount: newWaterCount, stage: newStage },
    });

    // DailySession 업데이트 (물주기 횟수 + 누적 집중 시간)
    await tx.dailySession.upsert({
      where: { userId_date: { userId, date: today } },
      update: { waterCount: { increment: 1 }, elapsedSec: effectiveElapsedSec },
      create: { userId, date: today, elapsedSec: effectiveElapsedSec, waterCount: 1 },
    });

    return [log, updated];
  });

  // Redis 세션 캐시 내 waterCount/creatureStage 업데이트
  void (async () => {
    try {
      const sessionIds = await getActiveDongSessions(dongCode);
      for (const sid of sessionIds) {
        const cached = await getSession(sid);
        if (cached?.userId === userId) {
          await setSession(sid, {
            ...cached,
            waterCount: userCreature.waterCount,
            creatureStage: userCreature.stage,
          });
          break;
        }
      }
      // 갱신된 유저 목록을 users:overlay로 브로드캐스트
      scheduleUsersOverlayBroadcast();
    } catch (err) {
      console.error('[water] Redis/SSE sync error:', err);
    }
  })();

  // SSE: 물주기 토스트 브로드캐스트
  broadcastToRegion(regionCode, {
    type: 'water:toast',
    data: { dongCode, nickname: nickname ?? '누군가' },
  });

  const myWaterCount = (daily?.waterCount ?? 0) + 1;
  return res.json({
    myWaterCount,
    userCreature: { stage: userCreature.stage, waterCount: userCreature.waterCount },
  });
});

// GET /water/me?userId=...&date=...  — 내 오늘 물주기 횟수
waterRouter.get('/me', async (req: Request, res: Response) => {
  const { userId, date } = req.query as { userId: string; date?: string };
  const today = date ?? getKstDateString();

  const daily = await prisma.dailySession.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  return res.json({ waterCount: daily?.waterCount ?? 0, date: today });
});
