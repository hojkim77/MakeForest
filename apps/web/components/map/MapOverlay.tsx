'use client';

import { useEffect, useState } from 'react';
import { useActivityStream } from '@/hooks/useActivityStream';
import { useMapStore } from '@/store';
import { regionDisplayName } from '@makeforest/types';

const LEGEND = [
  { colorClass: 'bg-primary', label: 'Old Growth' },
  { colorClass: 'bg-secondary', label: 'Sapling' },
  { colorClass: 'bg-outline', label: 'Soil' },
] as const;

interface RegionAggregate {
  userCount: number;
  totalWaterCount: number;
}

/**
 * Decorative overlay rendered on top of the map canvas.
 * Pixel mode: global active user count.
 * Forest mode: focused region aggregate stats (user count, total water count).
 */
export function MapOverlay() {
  const { activity } = useActivityStream();
  const activeUsers = Object.values(activity).reduce((sum, n) => sum + n, 0);
  const { mapMode, focusedRegionCode } = useMapStore();

  const [regionStats, setRegionStats] = useState<RegionAggregate | null>(null);

  useEffect(() => {
    if (mapMode !== 'forest' || !focusedRegionCode) {
      setRegionStats(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/creature/${encodeURIComponent(focusedRegionCode)}`)
      .then((r) => r.json())
      .then((data: RegionAggregate) => { if (!cancelled) setRegionStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mapMode, focusedRegionCode]);

  const isForest = mapMode === 'forest';

  return (
    <>
      {/* Title card — top left */}
      <div className="absolute top-6 left-6 z-10 p-md bg-background border border-outline">
        <p className="font-mono text-pixel-stat text-primary-container uppercase tracking-wider">
          {isForest && focusedRegionCode
            ? regionDisplayName(focusedRegionCode)
            : 'Pixel Forest'}
        </p>

        {isForest && regionStats ? (
          <div className="mt-xs font-mono text-label text-outline space-y-0.5">
            <p>집중 중 {regionStats.userCount}명</p>
            <p>오늘 물주기 {regionStats.totalWaterCount}회</p>
          </div>
        ) : (
          <p className="font-mono text-label text-outline mt-xs">
            Live Sync: {activeUsers.toLocaleString()} users active
          </p>
        )}
      </div>

      {/* Legend — bottom right */}
      <div className="absolute bottom-16 right-6 z-10 flex flex-col gap-sm p-md bg-inverse-surface border border-outline">
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
