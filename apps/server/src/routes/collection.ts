import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { getKstDateString } from './water.logic';
import { addDays } from './stats.logic';
import { calcCollectionTarget, pickDailyCreature } from './collection.logic';
import type { CollectionProgress } from '@makeforest/types';

export const collectionRouter = Router();

// DailyCollection을 가져오거나 없으면 lazy 생성
export async function getOrCreateCollection(dongCode: string, date: string) {
  const existing = await prisma.dailyCollection.findUnique({
    where: { dongCode_date: { dongCode, date } },
  });
  if (existing) return existing;

  const sevenDaysAgo = addDays(date, -7);
  const activeRows = await prisma.wateringLog.findMany({
    where: { dongCode, date: { gte: sevenDaysAgo, lt: date } },
    distinct: ['userId'],
    select: { userId: true },
  });
  const target = calcCollectionTarget(activeRows.length);
  const creatureType = pickDailyCreature(dongCode, date);

  return prisma.dailyCollection.upsert({
    where: { dongCode_date: { dongCode, date } },
    update: {},
    create: { dongCode, date, creatureType, targetCount: target, currentCount: 0 },
  });
}

// 물주기 시 currentCount 증가, 달성 체크 후 CollectionProgress 반환
export async function incrementCollection(
  dongCode: string,
  date: string,
): Promise<CollectionProgress> {
  const collection = await getOrCreateCollection(dongCode, date);

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
    where: { dongCode_date: { dongCode, date } },
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

// GET /collection/today?dongCode=
collectionRouter.get('/today', async (req: Request, res: Response) => {
  try {
    const { dongCode } = req.query as { dongCode?: string };
    if (!dongCode) return res.status(400).json({ error: 'dongCode required' });

    const today = getKstDateString();
    const collection = await getOrCreateCollection(dongCode, today);

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
