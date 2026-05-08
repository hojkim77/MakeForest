import { Router, Request, Response } from 'express';
import { getActiveRegionSessions, getSession, redis, RedisKeys } from '@makeforest/redis';
import type { SSEEvent } from '@makeforest/types';

export const sseRouter = Router();

// SSE 연결 클라이언트 맵: regionCode → Set<Response>
const clients = new Map<string, Set<Response>>();

// 유저별 SSE 연결 맵: userId → Set<Response>
const userClients = new Map<string, Set<Response>>();

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

export function broadcastToUser(userId: string, event: SSEEvent): void {
  const connections = userClients.get(userId);
  if (!connections) return;
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  connections.forEach((res) => res.write(payload));
}

export async function buildRegionUsers(regionCode: string) {
  const sessionIds = await getActiveRegionSessions(regionCode);
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

// POST /sse/internal/force-logout — 내부 전용, x-internal-secret 필요
sseRouter.post('/internal/force-logout', (req: Request, res: Response) => {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
    return res.status(403).end();
  }
  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).end();
  broadcastToUser(userId, { type: 'force_logout', data: {} });
  return res.json({ ok: true });
});

// GET /sse/user?userId=xxx&loginToken=yyy — 유저별 개인 채널
// 연결 시점에 loginToken을 Redis와 대조 — 불일치면 force_logout 즉시 발송
sseRouter.get('/user', async (req: Request, res: Response): Promise<void> => {
  const userId = String(req.query['userId'] ?? '');
  const loginToken = String(req.query['loginToken'] ?? '');
  if (!userId || !loginToken) { res.status(400).end(); return; }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const redisToken = await redis.get<string>(RedisKeys.loginToken(userId));
  if (redisToken && redisToken !== loginToken) {
    res.write(`event: force_logout\ndata: {}\n\n`);
    res.end();
    return;
  }

  if (!userClients.has(userId)) userClients.set(userId, new Set());
  userClients.get(userId)!.add(res);

  const ping = setInterval(() => res.write(': ping\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(ping);
    userClients.get(userId)?.delete(res);
    if (userClients.get(userId)?.size === 0) userClients.delete(userId);
  });
});

// GET /sse/:regionCode
sseRouter.get('/:regionCode', async (req: Request, res: Response) => {
  const regionCode = decodeURIComponent(req.params['regionCode'] as string);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (!clients.has(regionCode)) clients.set(regionCode, new Set());
  clients.get(regionCode)!.add(res);

  // 초기 접속 시 현재 지역 유저 목록 전송
  try {
    const users = await buildRegionUsers(regionCode);
    res.write(`event: dong:users\ndata: ${JSON.stringify({ regionCode, users })}\n\n`);
  } catch (err) {
    console.error('[sse] initial user list error:', err);
  }

  // 핑 (30초 간격, 연결 유지)
  const pingInterval = setInterval(() => res.write(': ping\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clients.get(regionCode)?.delete(res);
  });
});
