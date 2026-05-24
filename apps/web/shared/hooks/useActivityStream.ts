'use client';

import { useEffect } from 'react';
import type { MapUser } from '@makeforest/types';
import { useActivityStore } from '@/shared/store/activityStore';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { useSseEvent } from './useSseEvent';

export type ActivityMap = Record<string, number>;
export type { MapUser };

export function useActivityStream() {
  const { setActivity, setActiveUsers } = useActivityStore();

  useEffect(() => {
    let destroyed = false;
    void (async () => {
      try {
        const { heatmap, users } = await api.get<{ heatmap: ActivityMap; users: MapUser[] }>(API_PATHS.SERVER_MAP_SNAPSHOT());
        if (destroyed) return;
        setActiveUsers(users);
        setActivity(heatmap);
      } catch {}
    })();
    return () => { destroyed = true; };
  }, [setActivity, setActiveUsers]);

  useSseEvent(API_PATHS.SERVER_SSE_ACTIVITY(), 'users:overlay', (data) => {
    setActiveUsers(JSON.parse(data) as MapUser[]);
  });

  useSseEvent(API_PATHS.SERVER_SSE_ACTIVITY(), 'heatmap:update', (data) => {
    setActivity(JSON.parse(data) as ActivityMap);
  });
}
