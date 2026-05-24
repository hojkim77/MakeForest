'use client';

import { useEffect, useRef } from 'react';
import { ssePool } from '@/shared/lib/ssePool';

export function useSseEvent(
  url: string | null,
  eventType: string,
  handler: (data: string) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!url) return;
    const stable = (data: string) => handlerRef.current(data);
    return ssePool.subscribe(url, eventType, stable);
  }, [url, eventType]);
}
