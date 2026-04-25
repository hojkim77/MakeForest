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

// GET /creature/:dongCode — 오늘의 동네 생명체
creatureRouter.get('/:dongCode', async (req: Request, res: Response) => {
  const { dongCode } = req.params as { dongCode: string };
  const today = getKstDateString();

  const creature = await prisma.creature.findUnique({
    where: { dongCode_date: { dongCode, date: today } },
  });

  return res.json({
    stage: creature?.stage ?? 0,
    waterCount: creature?.waterCount ?? 0,
    date: today,
  });
});
