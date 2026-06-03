import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { getKstDateString } from './water.logic';
import { addDays } from './stats.logic';
import { getDongShortName, getDongSigunguMap, getDongRegionKey } from '../dongCache';
import { RankingPeriodQuery, RegionRankingQuery } from '@makeforest/types';
import { aggregateRegionRankings } from './ranking.logic';

export const rankingRouter = Router();

// GET /ranking/dong?period=today|week|all
rankingRouter.get('/dong', async (req: Request, res: Response) => {
  try {
    const { period } = RankingPeriodQuery.parse(req.query);

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

    const rankings = await Promise.all(
      grouped.map(async (g, i) => ({
        rank: i + 1,
        dongCode: g.dongCode,
        dongName: (await getDongShortName(g.dongCode)) ?? g.dongCode,
        totalWater: g._sum?.waterCount ?? 0,
      })),
    );

    return res.json({ period, rankings });
  } catch (err) {
    console.error('[ranking] GET /dong error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /ranking/region?period=today|week|all&myDongCode=
rankingRouter.get('/region', async (req: Request, res: Response) => {
  try {
    const { period, myDongCode } = RegionRankingQuery.parse(req.query);

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
    });

    const sigunguMap = await getDongSigunguMap(grouped.map((g) => g.dongCode));

    const rankings = aggregateRegionRankings(
      grouped.map((g) => ({ dongCode: g.dongCode, waterCount: g._sum?.waterCount ?? 0 })),
      sigunguMap,
    );

    const myRegionKey = myDongCode ? await getDongRegionKey(myDongCode) : null;

    return res.json({ period, rankings, myRegionKey });
  } catch (err) {
    console.error('[ranking] GET /region error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
