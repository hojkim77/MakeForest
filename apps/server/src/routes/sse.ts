import { Router, Request, Response } from 'express';
import { getActiveDongSessions, getSession } from '@makeforest/redis';
import type { SSEEvent } from '@makeforest/types';

export const sseRouter = Router();

// SSE 연결 클라이언트 맵: dongCode → Set<Response>
const clients = new Map<string, Set<Response>>();

export function broadcastToDong(dongCode: string, event: SSEEvent): void {
  const room = clients.get(dongCode);
  if (!room) return;
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  room.forEach((res) => res.write(payload));
}

export function broadcastToAll(event: SSEEvent): void {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  clients.forEach((room) => room.forEach((res) => res.write(payload)));
}

export async function buildDongUsers(dongCode: string) {
  const sessionIds = await getActiveDongSessions(dongCode);
  const users = await Promise.all(
    sessionIds.map(async (id) => {
      const s = await getSession(id);
      if (!s) return null;
      const elapsedSec = Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000);
      return { nickname: s.userId, elapsedSec, todos: s.todos };
    }),
  );
  return users.filter(Boolean) as NonNullable<(typeof users)[number]>[];
}

// GET /sse/:dongCode
sseRouter.get('/:dongCode', async (req: Request, res: Response) => {
  const { dongCode } = req.params as { dongCode: string };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!clients.has(dongCode)) clients.set(dongCode, new Set());
  clients.get(dongCode)!.add(res);

  // 초기 접속 시 현재 동 유저 목록 전송
  const users = await buildDongUsers(dongCode);
  res.write(`event: dong:users\ndata: ${JSON.stringify({ dongCode, users })}\n\n`);

  // 핑 (30초 간격, 연결 유지)
  const pingInterval = setInterval(() => res.write(': ping\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clients.get(dongCode)?.delete(res);
  });
});
