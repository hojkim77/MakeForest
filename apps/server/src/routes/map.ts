import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys, getSession, getDailyOverlaySessions } from '@makeforest/redis';
import { toPixel, GRID_W, GRID_H, LAT_MIN, LAT_MAX, LNG_MIN, LNG_MAX } from './map.logic';
import { getKstDateString } from './water.logic';
import type { MapUser } from '@makeforest/types';

export { toPixel, GRID_W, GRID_H, LAT_MIN, LAT_MAX, LNG_MIN, LNG_MAX };

export const mapRouter = Router();

export async function buildUsersOverlay(): Promise<MapUser[]> {
  const today = getKstDateString();

  const sessionIds = await getDailyOverlaySessions(today);
  if (sessionIds.length === 0) return [];

  const caches = (await Promise.all(sessionIds.map((sid) => getSession(sid)))).filter(
    (s): s is NonNullable<typeof s> => s !== null && (s.status === 'RUNNING' || s.status === 'COMPLETED' || s.status === 'IDLE'),
  );
  if (caches.length === 0) return [];

  const unranked: Omit<MapUser, 'neighborhoodRank'>[] = caches.map((s) => ({
    userId: s.userId,
    nickname: s.nickname,
    dongCode: s.dongCode,
    pixelX: s.pixelX,
    pixelY: s.pixelY,
    totalWaterCount: s.totalWaterCount,
    todayWaterCount: s.todayWaterCount,
    creatureStage: s.creatureStage,
    sessionStatus: s.status === 'RUNNING' ? 'RUNNING' : s.status === 'IDLE' ? 'IDLE' : 'COMPLETE',
    todos: s.todosPublic ? s.todos : [],
  }));

  // 같은 dongCode 내 오늘 물주기 기준 순위 (1-based, 동률 처리 포함)
  const dongRankMap = new Map<string, number[]>();
  for (const u of unranked) {
    if (!dongRankMap.has(u.dongCode)) dongRankMap.set(u.dongCode, []);
    dongRankMap.get(u.dongCode)!.push(u.todayWaterCount);
  }
  dongRankMap.forEach((counts) => counts.sort((a, b) => b - a));

  const rankCounters = new Map<string, number>();
  const result: MapUser[] = unranked.map((u) => {
    const sorted = dongRankMap.get(u.dongCode)!;
    const key = `${u.dongCode}:${u.todayWaterCount}`;
    const baseRank = sorted.indexOf(u.todayWaterCount) + 1;
    const tieOffset = rankCounters.get(key) ?? 0;
    rankCounters.set(key, tieOffset + 1);
    return { ...u, neighborhoodRank: baseRank + tieOffset };
  });

  return result;
}

// GET /map/pixel-data — 전체 행정동 픽셀 좌표 (24h 캐시)
mapRouter.get('/pixel-data', async (_req: Request, res: Response) => {
  const dongs = await prisma.dong.findMany({
    select: { code: true, name: true, lat: true, lng: true },
  });

  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.json(
    dongs.map((d) => ({
      dongCode: d.code,
      name: d.name,
      ...toPixel(d.lat, d.lng),
    })),
  );
});

// GET /map/activity — 동별 활성 유저 수 스냅샷 (폴링 fallback)
mapRouter.get('/activity', async (_req: Request, res: Response) => {
  const heatmapRaw = await redis.hgetall(RedisKeys.heatmapDong());
  const activity: Record<string, number> = {};
  if (heatmapRaw) {
    for (const [dongCode, count] of Object.entries(heatmapRaw)) {
      activity[dongCode] = Number(count);
    }
  }
  res.json(activity);
});

// GET /map/snapshot — 초기 로드용 스냅샷 (heatmap + users overlay)
mapRouter.get('/snapshot', async (_req: Request, res: Response) => {
  const [heatmapRaw, users] = await Promise.all([
    redis.hgetall(RedisKeys.heatmapDong()),
    buildUsersOverlay(),
  ]);
  const heatmap: Record<string, number> = {};
  if (heatmapRaw) {
    for (const [code, count] of Object.entries(heatmapRaw)) {
      heatmap[code] = Number(count);
    }
  }
  return res.json({ heatmap, users });
});

