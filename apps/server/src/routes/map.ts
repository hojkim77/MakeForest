import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys } from '@makeforest/redis';
import { toPixel, GRID_W, GRID_H, LAT_MIN, LAT_MAX, LNG_MIN, LNG_MAX } from './map.logic';
import { getKstDateString } from './water.logic';
import type { MapUser, Todo } from '@makeforest/types';

export { toPixel, GRID_W, GRID_H, LAT_MIN, LAT_MAX, LNG_MIN, LNG_MAX };

export const mapRouter = Router();

// activity-stream 구독 클라이언트
const activityClients = new Set<Response>();

export function broadcastHeatmap(activity: Record<string, number>): void {
  const payload = `event: heatmap:update\ndata: ${JSON.stringify(activity)}\n\n`;
  activityClients.forEach((res) => res.write(payload));
}

export async function buildUsersOverlay(): Promise<MapUser[]> {
  const today = getKstDateString();

  // RUNNING / PAUSED 세션 조회 (미종료 세션만)
  const activeSessions = await prisma.focusSession.findMany({
    where: { status: { in: ['RUNNING', 'PAUSED'] } },
    select: { userId: true, status: true, todos: true },
  });

  const activeUserIds = new Set(activeSessions.map((s) => s.userId));

  // 오늘 활동했지만 현재 활성 세션 없는 유저 (IDLE) — DailySession 기준
  const idleDailies = await prisma.dailySession.findMany({
    where: { date: today, userId: { notIn: [...activeUserIds] }, elapsedSec: { gt: 0 } },
    select: { userId: true },
  });
  const idleUserIds = idleDailies.map((d) => d.userId);

  const allUserIds = [...activeUserIds, ...idleUserIds];
  if (allUserIds.length === 0) return [];

  // 유저 정보와 dongCode 조회
  const users = await prisma.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, nickname: true, dongCode: true, todosPublic: true },
  });

  const dongCodes = users.map((u) => u.dongCode).filter(Boolean) as string[];
  const dongs = await prisma.dong.findMany({
    where: { code: { in: dongCodes } },
    select: { code: true, lat: true, lng: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  const dongMap = new Map(dongs.map((d) => [d.code, d]));

  // 영구 생명체 조회 (누적 waterCount, stage)
  const creatures = await prisma.userCreature.findMany({
    where: { userId: { in: allUserIds } },
    select: { userId: true, waterCount: true, stage: true },
  });
  const creatureMap = new Map<string, { waterCount: number; stage: number }>(
    creatures.map((c) => [c.userId, c]),
  );

  // 오늘 일일 물주기 횟수 (표시·순위용)
  const dailies = await prisma.dailySession.findMany({
    where: { date: today, userId: { in: allUserIds } },
    select: { userId: true, waterCount: true },
  });
  const dailyWaterMap = new Map(dailies.map((d) => [d.userId, d.waterCount]));

  const unranked: Omit<MapUser, 'neighborhoodRank'>[] = [];

  for (const session of activeSessions) {
    const user = userMap.get(session.userId);
    if (!user?.dongCode) continue;
    const dong = dongMap.get(user.dongCode);
    if (!dong) continue;
    const { pixelX, pixelY } = toPixel(dong.lat, dong.lng);
    const creature = creatureMap.get(session.userId) ?? { waterCount: 0, stage: 0 };
    const todos = user.todosPublic ? (session.todos as unknown as Todo[]) : [];

    unranked.push({
      userId: session.userId,
      nickname: user.nickname,
      dongCode: user.dongCode,
      pixelX,
      pixelY,
      waterCount: creature.waterCount,
      todayWaterCount: dailyWaterMap.get(session.userId) ?? 0,
      creatureStage: creature.stage,
      sessionStatus: session.status === 'RUNNING' ? 'RUNNING' : 'PAUSED',
      todos,
    });
  }

  for (const userId of idleUserIds) {
    const user = userMap.get(userId);
    if (!user?.dongCode) continue;
    const dong = dongMap.get(user.dongCode);
    if (!dong) continue;
    const { pixelX, pixelY } = toPixel(dong.lat, dong.lng);
    const creature = creatureMap.get(userId) ?? { waterCount: 0, stage: 0 };

    unranked.push({
      userId,
      nickname: user.nickname,
      dongCode: user.dongCode,
      pixelX,
      pixelY,
      waterCount: creature.waterCount,
      todayWaterCount: dailyWaterMap.get(userId) ?? 0,
      creatureStage: creature.stage,
      sessionStatus: 'IDLE',
      todos: [],
    });
  }

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

export async function broadcastUsersOverlay(): Promise<void> {
  const users = await buildUsersOverlay();
  const payload = `event: users:overlay\ndata: ${JSON.stringify(users)}\n\n`;
  activityClients.forEach((res) => res.write(payload));
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

// GET /map/activity-stream — SSE로 동별 활성도 + 유저 오버레이 실시간 전송 (10초 간격)
mapRouter.get('/activity-stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  activityClients.add(res);

  const sendSnapshot = async () => {
    const heatmapRaw = await redis.hgetall(RedisKeys.heatmapDong());
    const activity: Record<string, number> = {};
    if (heatmapRaw) {
      for (const [dongCode, count] of Object.entries(heatmapRaw)) {
        activity[dongCode] = Number(count);
      }
    }
    res.write(`event: heatmap:update\ndata: ${JSON.stringify(activity)}\n\n`);

    const users = await buildUsersOverlay();
    res.write(`event: users:overlay\ndata: ${JSON.stringify(users)}\n\n`);
  };

  await sendSnapshot();

  const interval = setInterval(sendSnapshot, 10_000);
  const ping = setInterval(() => res.write(': ping\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(ping);
    activityClients.delete(res);
  });
});
