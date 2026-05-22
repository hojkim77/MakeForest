import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { getKstDateString } from './water.logic';
import { addDays } from './stats.logic';
import { calcCollectionTarget, pickDailyCreature } from './collection.logic';
import { CollectionQuery, type CollectionProgress } from '@makeforest/types';

export const collectionRouter = Router();

// DailyCollection을 가져오거나 없으면 lazy 생성
export async function getOrCreateCollection(regionCode: string, date: string) {
  const existing = await prisma.dailyCollection.findUnique({
    where: { regionCode_date: { regionCode, date } },
  });
  if (existing) return existing;

  const sevenDaysAgo = addDays(date, -7);
  const activeRows = await prisma.wateringLog.findMany({
    where: { date: { gte: sevenDaysAgo, lt: date }, user: { regionCode } },
    distinct: ['userId'],
    select: { userId: true },
  });
  const target = calcCollectionTarget(activeRows.length);
  const creatureType = pickDailyCreature(regionCode, date);

  return prisma.dailyCollection.upsert({
    where: { regionCode_date: { regionCode, date } },
    update: {},
    create: { regionCode, date, creatureType, targetCount: target, currentCount: 0 },
  });
}

// 세션 시작 시 currentCount 증가, 달성 체크 후 CollectionProgress 반환
export async function incrementCollection(
  regionCode: string,
  date: string,
): Promise<CollectionProgress> {
  const collection = await getOrCreateCollection(regionCode, date);

  if (collection.isCompleted) {
    return {
      creatureType: collection.creatureType,
      currentCount: collection.currentCount,
      targetCount: collection.targetCount,
      isCompleted: true,
    };
  }

  const newCount = collection.currentCount + 1;
  const isCompleted = newCount >= collection.targetCount;

  const updated = await prisma.dailyCollection.update({
    where: { regionCode_date: { regionCode, date } },
    data: {
      currentCount: newCount,
      isCompleted,
      ...(isCompleted ? { completedAt: new Date() } : {}),
    },
  });

  return {
    creatureType: updated.creatureType,
    currentCount: updated.currentCount,
    targetCount: updated.targetCount,
    isCompleted: updated.isCompleted,
  };
}

// GET /collection/today?regionCode=
collectionRouter.get('/today', async (req: Request, res: Response) => {
  try {
    const { regionCode } = CollectionQuery.parse(req.query);

    const today = getKstDateString();
    const collection = await getOrCreateCollection(regionCode, today);

    return res.json({
      creatureType: collection.creatureType,
      targetCount: collection.targetCount,
      currentCount: collection.currentCount,
      isCompleted: collection.isCompleted,
    });
  } catch (err) {
    console.error('[collection] GET /today error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /collection/completed?regionCode=
collectionRouter.get('/completed', async (req: Request, res: Response) => {
  try {
    const { regionCode } = CollectionQuery.parse(req.query);

    const completed = await prisma.dailyCollection.findMany({
      where: { regionCode, isCompleted: true },
      select: { creatureType: true, date: true },
      orderBy: { date: 'asc' },
    });

    return res.json(completed);
  } catch (err) {
    console.error('[collection] GET /completed error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
