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

// GET /creature/:regionCode — 오늘의 시/군 생명체
creatureRouter.get('/:regionCode', async (req: Request, res: Response) => {
  const regionCode = decodeURIComponent(req.params['regionCode'] as string);
  const today = getKstDateString();

  const creature = await prisma.creature.findUnique({
    where: { regionCode_date: { regionCode, date: today } },
  });

  return res.json({
    stage: creature?.stage ?? 0,
    waterCount: creature?.waterCount ?? 0,
    date: today,
  });
});
