'use client';

import { useEffect } from 'react';
import type { MapUser } from '@makeforest/types';
import { useActivityStore } from '@/shared/store/activityStore';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';

export type ActivityMap = Record<string, number>;
export type { MapUser };

export function useActivityStream() {
  const { setActivity, setActiveUsers } = useActivityStore();

  useEffect(() => {
    let es: EventSource;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    void (async () => {
      try {
        const { heatmap, users } = await api.get<{ heatmap: ActivityMap; users: MapUser[] }>(API_PATHS.SERVER_MAP_SNAPSHOT());
        if (destroyed) return;
        setActiveUsers(users);
        setActivity(heatmap);
      } catch {}
    })();

    const connect = () => {
      es = new EventSource(API_PATHS.SERVER_SSE_ACTIVITY());

      es.addEventListener('users:overlay', (e: MessageEvent<string>) => {
        const users = JSON.parse(e.data) as MapUser[];
        setActiveUsers(users);
      });

      es.addEventListener('heatmap:update', (e: MessageEvent<string>) => {
        retryDelay = 1000;
        setActivity(JSON.parse(e.data) as ActivityMap);
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
