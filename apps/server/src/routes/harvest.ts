import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { deleteSession, removeActiveDong } from '@makeforest/redis';
import { broadcastToDong } from './sse';
import type { CreatureType } from '@makeforest/types';

export const harvestRouter = Router();

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

function getSeason(date: Date): Season {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function pickCreatureType(actualSec: number, season: Season): CreatureType {
  const pools: Record<string, CreatureType[]> = {
    seed: ['SEED', 'SPROUT'],
    grass: ['GRASS', 'FLOWER_A', 'FLOWER_B'],
    small: ['SAPLING', 'MUSHROOM', 'ROCK'],
    mid: ['OAK', 'PINE', 'BAMBOO'],
    big: ['BIG_OAK', 'CHERRY', 'RARE_ANIMAL'],
  };

  let pool: CreatureType[];
  if (actualSec < 30 * 60) pool = pools['seed']!;
  else if (actualSec < 60 * 60) pool = pools['grass']!;
  else if (actualSec < 2 * 60 * 60) pool = pools['small']!;
  else if (actualSec < 3 * 60 * 60) pool = pools['mid']!;
  else pool = pools['big']!;

  // 계절 보정
  const seasonBonus: Partial<Record<Season, CreatureType[]>> = {
    spring: ['FLOWER_A', 'FLOWER_B', 'CHERRY'],
    summer: ['GRASS', 'BAMBOO'],
    autumn: ['MUSHROOM', 'OAK'],
    winter: ['PINE', 'BIG_OAK'],
  };
  const bonus = seasonBonus[season] ?? [];
  const weighted = [...pool, ...bonus.filter((t) => pool.includes(t))];

  return weighted[Math.floor(Math.random() * weighted.length)]!;
}

// POST /harvest/:sessionId
harvestRouter.post('/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params as { sessionId: string };
  const { userId } = req.body as { userId: string };

  const session = await prisma.focusSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  if (session.status !== 'COMPLETED') {
    return res.status(400).json({ error: 'Session not completed' });
  }

  // 하루 1회 수확 제한 (KST)
  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\. /g, '-').replace('.', '');

  const alreadyHarvested = await prisma.forestObject.findFirst({
    where: { userId, date: today },
  });
  if (alreadyHarvested) {
    return res.status(409).json({ error: '오늘은 이미 수확했습니다.' });
  }

  const actualSec = Math.min(
    Math.floor((session.endedAt!.getTime() - session.startedAt.getTime()) / 1000),
    18_000,
  );

  if (actualSec < 60) {
    return res.status(400).json({ error: '최소 1분 이상 집중해야 수확할 수 있습니다.' });
  }

  const creatureType = pickCreatureType(actualSec, getSeason(new Date()));

  // 빈 좌표 찾기 (트랜잭션)
  const forestObject = await prisma.$transaction(async (tx) => {
    const occupied = await tx.forestObject.findMany({
      where: { dongCode: session.dongCode },
      select: { forestX: true, forestY: true },
    });
    const occupiedSet = new Set(occupied.map(({ forestX, forestY }) => `${forestX},${forestY}`));

    let x: number, y: number;
    do {
      x = Math.floor(Math.random() * 100);
      y = Math.floor(Math.random() * 100);
    } while (occupiedSet.has(`${x},${y}`) && occupiedSet.size < 10_000);

    const obj = await tx.forestObject.create({
      data: {
        userId,
        sessionId,
        dongCode: session.dongCode,
        forestX: x,
        forestY: y,
        creatureType,
        date: today,
      },
    });

    await tx.focusSession.update({
      where: { id: sessionId },
      data: { status: 'HARVESTED', actualSec },
    });

    return obj;
  });

  await deleteSession(sessionId);
  await removeActiveDong(session.dongCode, sessionId);

  broadcastToDong(session.dongCode, {
    type: 'harvest:new',
    data: { dongCode: session.dongCode, forestObject: forestObject as any },
  });

  return res.json({ forestObject });
});
