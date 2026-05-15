'use client';

import { useEffect } from 'react';
import type { MapUser } from '@makeforest/types';
import { useActivityStore } from '@/shared/store/activityStore';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';

export type ActivityMap = Record<string, number>;
export type { MapUser };

let aliasCache: Record<string, string> | null = null;

export function _resetAliasCache() { aliasCache = null; }

async function loadAlias(): Promise<Record<string, string>> {
  if (aliasCache) return aliasCache;
  try {
    const res = await fetch('/dong-alias.json');
    aliasCache = await res.json() as Record<string, string>;
  } catch {
    aliasCache = {};
  }
  return aliasCache;
}

export function useActivityStream() {
  const { setActivity, setActiveUsers } = useActivityStore();

  useEffect(() => {
    let es: EventSource;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    void (async () => {
      try {
        const { heatmap: rawHeatmap, users } = await api.get<{ heatmap: ActivityMap; users: MapUser[] }>(API_PATHS.SERVER_MAP_SNAPSHOT());
        if (destroyed) return;
        setActiveUsers(users);
        const alias = await loadAlias();
        const merged: ActivityMap = {};
        for (const [code, count] of Object.entries(rawHeatmap)) {
          const target = alias[code] ?? code;
          merged[target] = (merged[target] ?? 0) + count;
        }
        setActivity(merged);
      } catch {}
    })();

    const connect = () => {
      es = new EventSource(API_PATHS.SERVER_SSE_ACTIVITY());

      es.addEventListener('users:overlay', (e: MessageEvent<string>) => {
        const users = JSON.parse(e.data) as MapUser[];
        setActiveUsers(users);
      });

      es.addEventListener('heatmap:update', async (e: MessageEvent<string>) => {
        retryDelay = 1000;
        const raw = JSON.parse(e.data) as ActivityMap;
        const alias = await loadAlias();
        const merged: ActivityMap = {};
        for (const [code, count] of Object.entries(raw)) {
          const target = alias[code] ?? code;
          merged[target] = (merged[target] ?? 0) + count;
        }
        setActivity(merged);
      });

      es.onerror = () => {
        es.close();
        if (destroyed) return;
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30_000);
          connect();
        }, retryDelay);
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [setActivity, setActiveUsers]);
}
