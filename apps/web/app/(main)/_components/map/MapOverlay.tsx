'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActivityStore } from '@/shared/store';
import { usePixelMapData } from '@/shared/hooks/usePixelMapData';
import { useMapStore } from '@/shared/store';
import { regionDisplayName, regionOf } from '@makeforest/types';

const LEGEND = [
  { colorClass: 'bg-primary', label: 'Old Growth' },
  { colorClass: 'bg-secondary', label: 'Sapling' },
  { colorClass: 'bg-outline', label: 'Soil' },
] as const;

export function MapOverlay() {
  const activity = useActivityStore((s) => s.activity);
  const globalActiveUsers = Object.values(activity).reduce((sum, n) => sum + n, 0);
  const { mapMode, focusedRegionCode } = useMapStore();
  const { data: pixelMap } = usePixelMapData();

  // 현재 집중 중인 유저 수 — activity stream 기반 (real-time)
  const focusingCount = useMemo(() => {
    if (mapMode !== 'forest' || !focusedRegionCode) return 0;
    let total = 0;
    for (const cell of pixelMap.cells) {
      if (regionOf(cell.code, cell.name) === focusedRegionCode) {
        total += activity[cell.code] ?? 0;
      }
    }
    return total;
  }, [pixelMap.cells, activity, focusedRegionCode, mapMode]);

  const [totalWaterCount, setTotalWaterCount] = useState<number | null>(null);

  useEffect(() => {
    if (mapMode !== 'forest' || !focusedRegionCode) {
      setTotalWaterCount(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/creature/${encodeURIComponent(focusedRegionCode)}`)
      .then((r) => r.json())
      .then((data: { totalWaterCount: number }) => { if (!cancelled) setTotalWaterCount(data.totalWaterCount); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mapMode, focusedRegionCode]);

  const isForest = mapMode === 'forest';

  return (
    <>
      {/* Title card — top right */}
      <div className="absolute top-6 right-6 z-10 p-md bg-background border border-outline text-right">
        <p className="font-mono text-pixel-stat text-primary-container uppercase tracking-wider">
          {isForest && focusedRegionCode
            ? regionDisplayName(focusedRegionCode)
            : 'Pixel Forest'}
        </p>

        {isForest && focusedRegionCode ? (
          <div className="mt-xs font-mono text-label text-outline space-y-0.5">
            <p>집중 중 {focusingCount}명</p>
            <p>오늘 물주기 {totalWaterCount ?? '…'}회</p>
          </div>
        ) : (
          <p className="font-mono text-label text-outline mt-xs">
            Live Sync: {globalActiveUsers.toLocaleString()} users active
          </p>
        )}
      </div>

      {/* Legend — bottom left */}
      <div className="absolute bottom-16 left-6 z-10 flex flex-col gap-sm p-md bg-inverse-surface border border-outline">
        {LEGEND.map(({ colorClass, label }) => (
          <div key={label} className="flex items-center gap-md">
            <div className={`w-3 h-3 ${colorClass}`} />
            <span className="font-mono text-label text-inverse-on-surface">{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
