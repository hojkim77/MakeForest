'use client';

import { useWaterStore } from '@/shared/store';


export function NeighborhoodStats() {
  const growthPercent = useWaterStore((s) => s.growthPercent);
  const clamped = Math.max(0, Math.min(100, growthPercent));

  return (
    <div className="flex flex-col gap-sm p-md bg-surface-container-low border border-outline-variant">
      <span className="font-mono text-label text-outline uppercase tracking-tighter">
        Current Neighborhood Status
      </span>

      <div className="flex justify-between items-center">
        <span className="font-mono text-pixel-stat text-on-surface">
          내 생명체 성장률
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
