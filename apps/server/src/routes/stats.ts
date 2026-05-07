import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { getKstDateString, addDays, calcStreak } from './stats.logic';

export const statsRouter = Router();

// GET /stats/me?userId=...&dongCode=...
statsRouter.get('/me', async (req: Request, res: Response) => {
  const { userId, dongCode } = req.query as { userId: string; dongCode?: string };

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const today = getKstDateString();

  // 1. 총 집중 시간
  const dailySessions = await prisma.dailySession.findMany({
    where: { userId },
    select: { date: true, elapsedSec: true, waterCount: true },
  });
  const totalFocusSec = dailySessions.reduce((sum, s) => sum + s.elapsedSec, 0);

  // 2. 스트릭 (waterCount > 0인 날)
  const waterDates = dailySessions
    .filter(s => s.waterCount > 0)
    .map(s => s.date);
  const { current: currentStreak, max: maxStreak } = calcStreak(waterDates, today);

  // 3. 동네 기여 순위
  // groupBy는 relation 필터를 지원하지 않으므로 두 단계로 분리
  let neighborhoodRank = 0;
  let neighborhoodTotal = 0;
  if (dongCode) {
    const dongUserRows: { id: string }[] = await prisma.user.findMany({ where: { dongCode }, select: { id: true } });
    const dongUserIds = dongUserRows.map(r => r.id);

    neighborhoodTotal = dongUserIds.length;

    if (dongUserIds.length > 0) {
      const ranked = await prisma.dailySession.groupBy({
        by: ['userId'],
        where: { userId: { in: dongUserIds } },
        _sum: { waterCount: true },
        orderBy: { _sum: { waterCount: 'desc' } },
      });

      const myIdx = ranked.findIndex(u => u.userId === userId);
      // 아직 물주기 기록 없는 유저는 마지막 순위
      neighborhoodRank = myIdx >= 0 ? myIdx + 1 : neighborhoodTotal;
    }
  }

  // 4. 주간 기여 (최근 4주, 각 주의 waterCount 합)
  const fourWeeksAgo = addDays(today, -28);
  const recentSessions = dailySessions.filter(s => s.date >= fourWeeksAgo);

  const weeklyData = [1, 2, 3, 4].map((weekNum) => {
    const endOffset = -(weekNum - 1) * 7;
    const startOffset = -weekNum * 7;
    const endDate = addDays(today, endOffset);
    const startDate = addDays(today, startOffset + 1);

    const weekWater = recentSessions
      .filter(s => s.date >= startDate && s.date <= endDate)
      .reduce((sum, s) => sum + s.waterCount, 0);

    return { week: 5 - weekNum, waterCount: weekWater }; // week 1=oldest, week4=newest
  });
  weeklyData.sort((a, b) => a.week - b.week);

  const weeklyAvg = Math.round(
    weeklyData.reduce((sum, w) => sum + w.waterCount, 0) / 4,
  );

  // 5. 생명체 컬렉션 — 유저의 Fossil 직접 조회
  const SEED_TYPES = ['SEED'];
  const SPROUT_TYPES = ['SPROUT'];
  const GRASS_TYPES = ['GRASS', 'FLOWER_A', 'FLOWER_B', 'MUSHROOM', 'ROCK'];
  const TREE_TYPES = ['SAPLING', 'OAK', 'PINE', 'BAMBOO', 'BIG_OAK', 'CHERRY', 'RARE_ANIMAL'];

  const fossils = await prisma.fossil.findMany({
    where: { userId },
    select: { creatureType: true },
  });

  const collection = {
    seed: fossils.filter(o => SEED_TYPES.includes(o.creatureType)).length,
    sprout: fossils.filter(o => SPROUT_TYPES.includes(o.creatureType)).length,
    grass: fossils.filter(o => GRASS_TYPES.includes(o.creatureType)).length,
    tree: fossils.filter(o => TREE_TYPES.includes(o.creatureType)).length,
  };

  // 6. 동네 이름
  let dongName: string | null = null;
  if (dongCode) {
    const dong = await prisma.dong.findUnique({ where: { code: dongCode }, select: { name: true } });
    dongName = dong?.name ?? null;
  }

  return res.json({
    totalFocusSec,
    currentStreak,
    maxStreak,
    neighborhoodRank,
    neighborhoodTotal,
    weeklyData,
    weeklyAvg,
    collection,
    dongName,
  });
});
