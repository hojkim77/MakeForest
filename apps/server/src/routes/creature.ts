import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';

export const creatureRouter = Router();

function getKstDateString(): string {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '');
}

// GET /creature/:regionCode — 해당 지역 오늘 UserCreature 집계
creatureRouter.get('/:regionCode', async (req: Request, res: Response) => {
  const regionCode = decodeURIComponent(req.params['regionCode'] as string);
  const today = getKstDateString();

  // 해당 regionCode에 속한 유저들의 오늘 UserCreature 집계
  const users = await prisma.user.findMany({
    where: { regionCode },
    select: { id: true },
  });

  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) {
    return res.json({ userCount: 0, avgStage: 0, maxStage: 0, totalWaterCount: 0, date: today });
  }

  const creatures = await prisma.userCreature.findMany({
    where: { date: today, userId: { in: userIds } },
    select: { stage: true, waterCount: true },
  });

  const userCount = creatures.length;
  const totalWaterCount = creatures.reduce((sum, c) => sum + c.waterCount, 0);
  const avgStage = userCount > 0 ? Math.round(creatures.reduce((sum, c) => sum + c.stage, 0) / userCount) : 0;
  const maxStage = userCount > 0 ? Math.max(...creatures.map((c) => c.stage)) : 0;

  return res.json({ userCount, avgStage, maxStage, totalWaterCount, date: today });
});
