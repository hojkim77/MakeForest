import { redis } from './client';
import { RedisKeys, SESSION_TTL_SECONDS } from './keys';
import type { ActiveSessionCache } from '@makeforest/types';

export async function setSession(sessionId: string, data: ActiveSessionCache): Promise<void> {
  await redis.set(RedisKeys.session(sessionId), JSON.stringify(data), 'EX', SESSION_TTL_SECONDS);
}

export async function getSession(sessionId: string): Promise<ActiveSessionCache | null> {
  const raw = await redis.get(RedisKeys.session(sessionId));
  if (!raw) return null;
  return JSON.parse(raw) as ActiveSessionCache;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(RedisKeys.session(sessionId));
}

export async function addActiveDong(dongCode: string, sessionId: string): Promise<void> {
  await redis.sadd(RedisKeys.dongActive(dongCode), sessionId);
}

export async function removeActiveDong(dongCode: string, sessionId: string): Promise<void> {
  await redis.srem(RedisKeys.dongActive(dongCode), sessionId);
}

export async function getActiveDongSessions(dongCode: string): Promise<string[]> {
  return redis.smembers(RedisKeys.dongActive(dongCode));
}

export async function getDongActiveCount(dongCode: string): Promise<number> {
  return redis.scard(RedisKeys.dongActive(dongCode));
}

