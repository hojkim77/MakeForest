'use client';

import { useWaterQuery, type WaterQueryData } from '@/shared/hooks/queries/useWaterQuery';
import { Card } from '@/shared/components/ui/Card';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';

interface Props {
  userId: string | null;
  initialWater: WaterQueryData;
}

export function NeighborhoodStats({ userId, initialWater }: Props) {
  const { growthPercent } = useWaterQuery({ userId, initialData: initialWater });
  const clamped = Math.max(0, Math.min(100, growthPercent));

  return (
    <Card variant="low" border data-guide="panel.myNeighborhood" className="flex flex-col gap-sm">
      <span className="font-mono text-label text-on-surface-variant uppercase tracking-tighter">
        Current Neighborhood Status
      </span>

      <div className="flex justify-between items-center">
        <span className="font-mono text-pixel-stat text-on-surface">
          내 생명체 성장률
        </span>
        <span className="font-mono text-pixel-stat text-primary">{clamped}%</span>
      </div>

      <ProgressBar value={clamped} size="sm" />
    </Card>
  );
}
