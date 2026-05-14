import { Router, Request, Response } from 'express';
import type { SSEEvent } from '@makeforest/types';
import { buildUsersOverlay } from './map';

export const sseRouter = Router();

// regionCode 기반 클라이언트 맵: regionCode → Set<Response>
const clients = new Map<string, Set<Response>>();

// activity-stream 구독 클라이언트
const activityClients = new Set<Response>();

export function broadcastToRegion(regionCode: string, event: SSEEvent): void {
  const room = clients.get(regionCode);
  if (!room) return;
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  room.forEach((res) => res.write(payload));
}

export function broadcastToAll(event: SSEEvent): void {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  clients.forEach((room) => room.forEach((res) => res.write(payload)));
}

export function broadcastHeatmap(activity: Record<string, number>): void {
  const payload = `event: heatmap:update\ndata: ${JSON.stringify(activity)}\n\n`;
  activityClients.forEach((res) => res.write(payload));
}

export function broadcastUsersOverlay(): void {
  void buildUsersOverlay()
    .then((users) => {
      const payload = `event: users:overlay\ndata: ${JSON.stringify(users)}\n\n`;
      activityClients.forEach((res) => res.write(payload));
    })
    .catch((err) => console.error('[sse] broadcastUsersOverlay error:', err));
}

// GET /sse/activity-stream
sseRouter.get('/activity-stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  activityClients.add(res);

  const ping = setInterval(() => res.write(': ping\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(ping);
    activityClients.delete(res);
  });
});

// GET /sse/:regionCode — '11' 또는 '41:부천시' 형식만 허용
sseRouter.get('/activity-stream/regionCode/:regionCode', async (req: Request, res: Response) => {
  const regionCode = decodeURIComponent(req.params['regionCode'] as string);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!clients.has(regionCode)) clients.set(regionCode, new Set());
  clients.get(regionCode)!.add(res);

  const pingInterval = setInterval(() => res.write(': ping\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clients.get(regionCode)?.delete(res);
  });
});

