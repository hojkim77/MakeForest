'use client';

import { useWaterQuery, type WaterQueryData } from '@/shared/hooks/queries/useWaterQuery';

interface Props {
  userId: string | null;
  initialWater: WaterQueryData;
}

export function NeighborhoodStats({ userId, initialWater }: Props) {
  const { growthPercent } = useWaterQuery({ userId, initialData: initialWater });
  const clamped = Math.max(0, Math.min(100, growthPercent));

  return (
    <div data-guide="panel.myNeighborhood" className="flex flex-col gap-sm p-md bg-surface-container-low border border-outline-variant">
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
