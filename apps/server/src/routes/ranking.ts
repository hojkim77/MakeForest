import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { getKstDateString } from './water.logic';
import { addDays } from './stats.logic';
import { getDongShortName, getDongSigunguMap, getDongRegionKey } from '../dongCache';

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
    const { period = 'today', myDongCode } = req.query as { period?: string; myDongCode?: string };
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
    });

    const sigunguMap = await getDongSigunguMap(grouped.map((g) => g.dongCode));

    const regionMap = new Map<string, { totalWater: number; regionName: string }>();
    for (const g of grouped) {
      const info = sigunguMap.get(g.dongCode);
      if (!info) continue;
      const existing = regionMap.get(info.regionKey);
      if (existing) {
        existing.totalWater += g._sum?.waterCount ?? 0;
      } else {
        regionMap.set(info.regionKey, {
          totalWater: g._sum?.waterCount ?? 0,
          regionName: info.regionName,
        });
      }
    }

    const rankings = [...regionMap.entries()]
      .sort((a, b) => b[1].totalWater - a[1].totalWater)
      .slice(0, 20)
      .map(([regionKey, { regionName, totalWater }], i) => ({
        rank: i + 1,
        regionKey,
        regionName,
        totalWater,
      }));

    const myRegionKey = myDongCode ? await getDongRegionKey(myDongCode) : null;

    return res.json({ period, rankings, myRegionKey });
  } catch (err) {
    console.error('[ranking] GET /region error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
