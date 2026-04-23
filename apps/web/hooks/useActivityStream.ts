'use client';

import { useEffect, useRef, useState } from 'react';

// dongCode → 활성 유저 수
export type ActivityMap = Record<string, number>;

export function useActivityStream() {
  const [activity, setActivity] = useState<ActivityMap>({});
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
    const es = new EventSource(`${SERVER_URL}/map/activity-stream`);
    esRef.current = es;

    es.addEventListener('heatmap:update', (e: MessageEvent<string>) => {
      setActivity(JSON.parse(e.data) as ActivityMap);
    });

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, []);

  return activity;
}
