'use client';

import { useEffect, useState } from 'react';

// dongCode → 활성 유저 수
export type ActivityMap = Record<string, number>;

let aliasCache: Record<string, string> | null = null;

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
  const [activity, setActivity] = useState<ActivityMap>({});

  useEffect(() => {
    const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
    let es: EventSource;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connect = () => {
      es = new EventSource(`${SERVER_URL}/map/activity-stream`);

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
  }, []);

  return activity;
}
