import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { broadcastToDong } from './sse';
import { calcStage, getKstDateString, checkDailyCapExceeded } from './water.logic';

export const waterRouter = Router();

// POST /water — 물 주기
waterRouter.post('/', async (req: Request, res: Response) => {
  const { userId, dongCode, nickname } = req.body as {
    userId: string;
    dongCode: string;
    nickname: string;
  };

  if (!userId || !dongCode) {
    return res.status(400).json({ error: 'userId and dongCode required' });
  }

  const today = getKstDateString();

  // 오늘 누적 집중 시간이 6시간(21600초)을 초과했는지 확인
  const daily = await prisma.dailySession.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  if (checkDailyCapExceeded(daily?.elapsedSec ?? 0)) {
    return res.status(409).json({ error: '오늘 최대 집중 시간에 도달했습니다.' });
  }

  // 물주기 기록 생성 + Creature 업데이트 (트랜잭션)
  const [, creature] = await prisma.$transaction(async (tx) => {
    const log = await tx.wateringLog.create({
      data: { userId, dongCode, date: today },
    });

    const existing = await tx.creature.findUnique({
      where: { dongCode_date: { dongCode, date: today } },
    });

    const newWaterCount = (existing?.waterCount ?? 0) + 1;
    const newStage = calcStage(newWaterCount);

    const updated = await tx.creature.upsert({
      where: { dongCode_date: { dongCode, date: today } },
      update: { waterCount: newWaterCount, stage: newStage },
      create: { dongCode, date: today, waterCount: newWaterCount, stage: newStage },
    });

    // DailySession 업데이트 (내 물주기 횟수)
    await tx.dailySession.upsert({
      where: { userId_date: { userId, date: today } },
      update: { waterCount: { increment: 1 } },
      create: { userId, date: today, elapsedSec: 0, waterCount: 1 },
    });

    return [log, updated];
  });

  // SSE: 물주기 토스트 브로드캐스트
  broadcastToDong(dongCode, {
    type: 'water:toast',
    data: { dongCode, nickname: nickname ?? '누군가' },
  });

  // SSE: 생명체 단계 업데이트
  broadcastToDong(dongCode, {
    type: 'creature:update',
    data: { dongCode, stage: creature.stage, waterCount: creature.waterCount },
  });

  const myWaterCount = (daily?.waterCount ?? 0) + 1;
  return res.json({
    myWaterCount,
    creature: { stage: creature.stage, waterCount: creature.waterCount },
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
