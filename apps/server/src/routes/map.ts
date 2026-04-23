import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys } from '@makeforest/redis';

export const mapRouter = Router();

// 한반도 위경도 범위 및 그리드 크기
// 가로:세로 = (131.0-124.6)*cos(36°) : (38.9-33.0) ≈ 5.18 : 5.9 → 250×290
const LAT_MIN = 33.0, LAT_MAX = 38.9;
const LNG_MIN = 124.6, LNG_MAX = 131.0;
const GRID_W = 250, GRID_H = 290;

function toPixel(lat: number, lng: number) {
  return {
    pixelX: Math.max(0, Math.min(GRID_W - 1, Math.round(((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * GRID_W))),
    pixelY: Math.max(0, Math.min(GRID_H - 1, Math.round(((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * GRID_H))),
  };
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

// GET /map/activity-stream — SSE로 동별 활성도 실시간 전송 (10초 간격)
mapRouter.get('/activity-stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendSnapshot = async () => {
    const heatmapRaw = await redis.hgetall(RedisKeys.heatmapDong());
    const activity: Record<string, number> = {};
    if (heatmapRaw) {
      for (const [dongCode, count] of Object.entries(heatmapRaw)) {
        activity[dongCode] = Number(count);
      }
    }
    res.write(`event: heatmap:update\ndata: ${JSON.stringify(activity)}\n\n`);
  };

  await sendSnapshot();

  const interval = setInterval(sendSnapshot, 10_000);
  const ping = setInterval(() => res.write(': ping\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(ping);
  });
});
