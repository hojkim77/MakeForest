import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { getKstDateString } from './water.logic';
import { addDays } from './stats.logic';

export const rankingRouter = Router();

// GET /ranking/dong?period=today|week|all
rankingRouter.get('/dong', async (req: Request, res: Response) => {
  try {
    const { period = 'today' } = req.query as { period?: string };
    if (!['today', 'week', 'all'].includes(period)) {
      return res.status(400).json({ error: 'period must be today, week, or all' });
    }

    const today = getKstDateString();
    const where =
      period === 'today'
        ? { date: today }
        : period === 'week'
          ? { date: { gte: addDays(today, -6) } }
          : {};

    const grouped = await prisma.focusSession.groupBy({
      by: ['dongCode'],
      where,
      _sum: { waterCount: true },
      orderBy: { _sum: { waterCount: 'desc' } },
      take: 20,
    });

    const dongCodes = grouped.map((g) => g.dongCode);
    const dongs = await prisma.dong.findMany({
      where: { code: { in: dongCodes } },
      select: { code: true, name: true },
    });
    const dongNameMap = new Map(dongs.map((d) => [d.code, d.name]));

    const rankings = grouped.map((g, i) => ({
      rank: i + 1,
      dongCode: g.dongCode,
      dongName: dongNameMap.get(g.dongCode) ?? g.dongCode,
      totalWater: g._sum?.waterCount ?? 0,
    }));

    return res.json({ period, rankings });
  } catch (err) {
    console.error('[ranking] GET /dong error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
