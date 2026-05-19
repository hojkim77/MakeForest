'use client';

import { useEffect, useRef, useState } from 'react';

export interface GcStats {
  heapMB: number;
  growthMBps: number;
  avgGrowthMBps: number;
  gcRatio: number;
  longTaskCount: number;
  longTaskTotalMs: number;
}

const INITIAL: GcStats = {
  heapMB: 0,
  growthMBps: 0,
  avgGrowthMBps: 0,
  gcRatio: 0,
  longTaskCount: 0,
  longTaskTotalMs: 0,
};

const WINDOW_SIZE = 30; // 30 × 200ms = 6s rolling window

export function useGcMonitor(): GcStats {
  const [stats, setStats] = useState<GcStats>(INITIAL);
  const prevRef = useRef<{ heap: number; time: number } | null>(null);
  const growthBufferRef = useRef<number[]>([]);
  const longTaskRef = useRef({ count: 0, totalMs: 0 });

  useEffect(() => {
    let observer: PerformanceObserver | null = null;
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration >= 50) {
              longTaskRef.current.count += 1;
              longTaskRef.current.totalMs += entry.duration;
            }
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {
        // longtask not supported
      }
    }
    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const mem = (performance as any).memory;
      if (!mem) return;

      const now = performance.now();
      const heapMB = mem.usedJSHeapSize / 1_048_576;
      const prev = prevRef.current;

      let growthMBps = 0;
      if (prev) {
        const dt = (now - prev.time) / 1000;
        growthMBps = (heapMB - prev.heap) / dt;
      }
      prevRef.current = { heap: heapMB, time: now };

      const buf = growthBufferRef.current;
      buf.push(growthMBps);
      if (buf.length > WINDOW_SIZE) buf.shift();

      const avgGrowthMBps = buf.reduce((s, v) => s + v, 0) / buf.length;
      const gcRatio = buf.filter((v) => v < 0).length / buf.length;

      setStats({
        heapMB,
        growthMBps,
        avgGrowthMBps,
        gcRatio,
        longTaskCount: longTaskRef.current.count,
        longTaskTotalMs: longTaskRef.current.totalMs,
      });
    }, 200);

    return () => clearInterval(id);
  }, []);

  return stats;
}
