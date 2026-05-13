import { redis } from './client';
import { RedisKeys, SESSION_TTL_SECONDS } from './keys';
import type { ActiveSessionCache } from '@makeforest/types';

export async function setSession(sessionId: string, data: ActiveSessionCache, ttlSeconds = SESSION_TTL_SECONDS): Promise<void> {
  await redis.set(RedisKeys.session(sessionId), JSON.stringify(data), 'EX', ttlSeconds);
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

const OVERLAY_DAILY_TTL_SECONDS = 30 * 60 * 60; // 30h — 자정 이후 자연 만료

export async function addDailyOverlaySession(date: string, sessionId: string): Promise<void> {
  const key = RedisKeys.overlayDailySessions(date);
  await redis.sadd(key, sessionId);
  await redis.expire(key, OVERLAY_DAILY_TTL_SECONDS);
}

export async function removeDailyOverlaySession(date: string, sessionId: string): Promise<void> {
  await redis.srem(RedisKeys.overlayDailySessions(date), sessionId);
}

export async function getDailyOverlaySessions(date: string): Promise<string[]> {
  return redis.smembers(RedisKeys.overlayDailySessions(date));
}

