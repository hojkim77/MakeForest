import { Router, Request, Response } from 'express';
import type { SSEEvent } from '@makeforest/types';

export const sseRouter = Router();

// SSE 연결 클라이언트 맵: regionCode → Set<Response>
const clients = new Map<string, Set<Response>>();

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

// GET /sse/:regionCode
sseRouter.get('/:regionCode', async (req: Request, res: Response) => {
  const regionCode = decodeURIComponent(req.params['regionCode'] as string);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!clients.has(regionCode)) clients.set(regionCode, new Set());
  clients.get(regionCode)!.add(res);

  // 핑 (30초 간격, 연결 유지)
  const pingInterval = setInterval(() => res.write(': ping\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clients.get(regionCode)?.delete(res);
  });
});
