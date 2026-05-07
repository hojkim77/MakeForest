'use client';

import { useEffect, useState } from 'react';

interface NeighborhoodStatsProps {
  neighborhoodName: string;
  /** 0–100 (personal water progress) */
  growthPercent: number;
  regionCode?: string | null;
}

interface RegionAggregate {
  userCount: number;
  totalWaterCount: number;
}

export function NeighborhoodStats({ neighborhoodName, growthPercent, regionCode }: NeighborhoodStatsProps) {
  const clamped = Math.max(0, Math.min(100, growthPercent));
  const [aggregate, setAggregate] = useState<RegionAggregate | null>(null);

  useEffect(() => {
    if (!regionCode) { setAggregate(null); return; }
    fetch(`/api/creature/${encodeURIComponent(regionCode)}`)
      .then((r) => r.json())
      .then((data: RegionAggregate) => setAggregate(data))
      .catch(() => {});
  }, [regionCode]);

  return (
    <div className="flex flex-col gap-sm p-md bg-surface-container-low border border-outline-variant">
      <span className="font-mono text-label text-outline uppercase tracking-tighter">
        Current Neighborhood Status
      </span>

      {aggregate && (
        <div className="flex justify-between font-mono text-label text-on-surface-variant">
          <span>집중 {aggregate.userCount}명</span>
          <span>물주기 총 {aggregate.totalWaterCount}회</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="font-mono text-pixel-stat text-on-surface">
          {neighborhoodName} 내 성장률
        </span>
        <span className="font-mono text-pixel-stat text-primary">{clamped}%</span>
      </div>

      <div className="w-full h-2 bg-surface-variant overflow-hidden">
        <div
          className="h-full bg-primary-container transition-all duration-700"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
