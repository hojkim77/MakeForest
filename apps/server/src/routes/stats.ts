import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { getKstDateString, addDays, calcStreak } from './stats.logic';

export const statsRouter = Router();

// GET /stats/focus?userId=
statsRouter.get('/focus', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query as { userId: string };
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const today = getKstDateString();
    const sessions = await prisma.focusSession.findMany({
      where: { userId },
      select: { date: true, totalElapsedSec: true, waterCount: true },
    });

    const totalFocusSec = sessions.reduce((sum, s) => sum + s.totalElapsedSec, 0);
    const waterDates = sessions.filter(s => s.waterCount > 0).map(s => s.date);
    const { current: currentStreak, max: maxStreak } = calcStreak(waterDates, today);

    return res.json({ totalFocusSec, currentStreak, maxStreak });
  } catch (err) {
    console.error('[stats] GET /focus error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /stats/weekly?userId=
statsRouter.get('/weekly', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query as { userId: string };
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const today = getKstDateString();
    const fourWeeksAgo = addDays(today, -28);
    const sessions = await prisma.focusSession.findMany({
      where: { userId, date: { gte: fourWeeksAgo } },
      select: { date: true, waterCount: true },
    });

    const weeklyData = [1, 2, 3, 4].map((weekNum) => {
      const endDate = addDays(today, -(weekNum - 1) * 7);
      const startDate = addDays(today, -weekNum * 7 + 1);
      const weekWater = sessions
        .filter(s => s.date >= startDate && s.date <= endDate)
        .reduce((sum, s) => sum + s.waterCount, 0);
      return { week: 5 - weekNum, waterCount: weekWater };
    });
    weeklyData.sort((a, b) => a.week - b.week);

    const weeklyAvg = Math.round(weeklyData.reduce((sum, w) => sum + w.waterCount, 0) / 4);

    return res.json({ weeklyData, weeklyAvg });
  } catch (err) {
    console.error('[stats] GET /weekly error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /stats/rank?userId=&dongCode=
statsRouter.get('/rank', async (req: Request, res: Response) => {
  try {
    const { userId, dongCode } = req.query as { userId: string; dongCode?: string };
    if (!userId) return res.status(400).json({ error: 'userId required' });

    if (!dongCode) return res.json({ neighborhoodRank: 0, neighborhoodTotal: 0 });

    const dongUserRows = await prisma.user.findMany({ where: { dongCode }, select: { id: true } });
    const dongUserIds = dongUserRows.map(r => r.id);
    const neighborhoodTotal = dongUserIds.length;

    if (dongUserIds.length === 0) return res.json({ neighborhoodRank: 0, neighborhoodTotal: 0 });

    const ranked = await prisma.focusSession.groupBy({
      by: ['userId'],
      where: { userId: { in: dongUserIds } },
      _sum: { waterCount: true },
      orderBy: { _sum: { waterCount: 'desc' } },
    });

    const myIdx = ranked.findIndex(u => u.userId === userId);
    const neighborhoodRank = myIdx >= 0 ? myIdx + 1 : neighborhoodTotal;

    return res.json({ neighborhoodRank, neighborhoodTotal });
  } catch (err) {
    console.error('[stats] GET /rank error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
