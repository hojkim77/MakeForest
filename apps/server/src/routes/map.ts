import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys } from '@makeforest/redis';

export const mapRouter = Router();

// activity-stream 구독 클라이언트
const activityClients = new Set<Response>();

export function broadcastHeatmap(activity: Record<string, number>): void {
  const payload = `event: heatmap:update\ndata: ${JSON.stringify(activity)}\n\n`;
  activityClients.forEach((res) => res.write(payload));
}

import { toPixel, GRID_W, GRID_H, LAT_MIN, LAT_MAX, LNG_MIN, LNG_MAX } from './map.logic';
export { toPixel, GRID_W, GRID_H, LAT_MIN, LAT_MAX, LNG_MIN, LNG_MAX };

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
