'use client';

import { useGcMonitor } from './useGcMonitor';

export function GcMonitorOverlay() {
  const stats = useGcMonitor();
  const mem = (performance as any).memory;

  const avgColor =
    stats.avgGrowthMBps > 2.0
      ? 'text-red-400'
      : stats.avgGrowthMBps > 0.5
        ? 'text-yellow-300'
        : 'text-green-400';

  const gcRatioColor =
    stats.gcRatio > 0.5
      ? 'text-red-400'
      : stats.gcRatio > 0.3
        ? 'text-orange-300'
        : 'text-green-400';

  return (
    <div className="pointer-events-none absolute bottom-2 right-2 z-tooltip w-60 space-y-0.5 border border-white/10 bg-black/75 px-2 py-1.5 font-mono text-[10px] text-white/80">
      <p className="text-[9px] uppercase tracking-wider text-white/40">GC Monitor</p>
      {!mem ? (
        <p className="text-white/40">performance.memory unavailable</p>
      ) : (
        <>
          <p>Heap: <span className="text-white">{stats.heapMB.toFixed(1)} MB</span></p>
          <p>Avg growth (6s): <span className={avgColor}>{stats.avgGrowthMBps.toFixed(2)} MB/s</span></p>
          <p>GC ratio: <span className={gcRatioColor}>{(stats.gcRatio * 100).toFixed(0)}%</span></p>
          <p>Long tasks: {stats.longTaskCount} ({stats.longTaskTotalMs.toFixed(0)}ms)</p>
        </>
      )}
    </div>
  );
}
