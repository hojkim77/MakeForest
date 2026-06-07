'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMapSnapshotQuery } from '@/shared/hooks/queries/useMapSnapshotQuery';
import { usePixelMapQuery } from '@/shared/hooks/queries/usePixelMapQuery';
import { useMapStore } from '@/shared/store';
import { regionDisplayName, regionOf } from '@makeforest/types';

export function MapOverlay() {
  const { data: snapshot } = useMapSnapshotQuery();
  const activity = snapshot?.heatmap ?? {};
  const globalActiveUsers = Object.values(activity).reduce((sum, n) => sum + n, 0);
  const { mapMode, focusedRegionCode } = useMapStore();
  const { data: pixelMap } = usePixelMapQuery();

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
      .catch(() => { });
    return () => { cancelled = true; };
  }, [mapMode, focusedRegionCode]);

  const isForest = mapMode === 'forest';

  if (isForest && focusedRegionCode) {
    return (
      <div className="absolute top-6 right-6 z-map-content bg-surface border-2 border-outline shadow-island-lg px-[20px] py-[14px] text-right">
        <div className="text-[18px] font-black text-outline tracking-tight">
          {regionDisplayName(focusedRegionCode)}
        </div>
        <div className="flex items-center justify-end gap-[6px] mt-[6px]">
          <span className="text-[13px] text-on-surface font-bold">
            지금 <strong className="text-primary">{focusingCount}명</strong> 집중 중
          </span>
        </div>
        {totalWaterCount !== null && (
          <div className="text-[12px] text-on-surface-variant mt-[4px]">
            오늘 물주기 <strong className="text-primary">{totalWaterCount}회</strong>
          </div>
        )}
      </div>
    );
  }

  // Pixel mode: global stats
  return (
    <div className="absolute top-6 right-6 z-map-content bg-surface border-2 border-outline shadow-island-lg px-[20px] py-[14px] text-right">
      <div className="flex items-center justify-end gap-[6px]">
        <span className="text-[13px] text-on-surface font-bold">
          지금 <strong className="text-primary">{globalActiveUsers.toLocaleString()}명</strong> 집중 중
        </span>
      </div>
    </div>
  );
}
