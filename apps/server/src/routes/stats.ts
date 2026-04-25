import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';

export const statsRouter = Router();

function getKstDateString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '');
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '');
}

function calcStreak(datesWithWater: string[], today: string): { current: number; max: number } {
  if (datesWithWater.length === 0) return { current: 0, max: 0 };

  const sorted = [...datesWithWater].sort().reverse(); // DESC
  const yesterday = addDays(today, -1);

  let current = 0;
  // 연속 스트릭: 오늘 또는 어제부터 거슬러 올라감
  const startDate = sorted[0] === today || sorted[0] === yesterday ? sorted[0] : null;
  if (startDate) {
    let expected = startDate;
    for (const date of sorted) {
      if (date === expected) {
        current++;
        expected = addDays(expected, -1);
      } else {
        break;
      }
    }
  }

  // 역대 최장 스트릭
  const ascSorted = [...datesWithWater].sort();
  let max = 0;
  let run = 1;
  for (let i = 1; i < ascSorted.length; i++) {
    if (ascSorted[i] === addDays(ascSorted[i - 1]!, 1)) {
      run++;
    } else {
      max = Math.max(max, run);
      run = 1;
    }
  }
  max = Math.max(max, run);

  return { current, max };
}

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

  // 5. 생명체 컬렉션 (ForestObject by creatureType)
  const SEED_TYPES = ['SEED'];
  const SPROUT_TYPES = ['SPROUT'];
  const GRASS_TYPES = ['GRASS', 'FLOWER_A', 'FLOWER_B', 'MUSHROOM', 'ROCK'];
  const TREE_TYPES = ['SAPLING', 'OAK', 'PINE', 'BAMBOO', 'BIG_OAK', 'CHERRY', 'RARE_ANIMAL'];

  const forestObjects = await prisma.forestObject.findMany({
    where: { userId },
    select: { creatureType: true },
  });

  const collection = {
    seed: forestObjects.filter(o => SEED_TYPES.includes(o.creatureType)).length,
    sprout: forestObjects.filter(o => SPROUT_TYPES.includes(o.creatureType)).length,
    grass: forestObjects.filter(o => GRASS_TYPES.includes(o.creatureType)).length,
    tree: forestObjects.filter(o => TREE_TYPES.includes(o.creatureType)).length,
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
