'use client';

import { useWaterQuery, type WaterQueryData } from '@/shared/hooks/queries/useWaterQuery';
import { CreatureSprite, STAGE_LABELS } from '@/shared/components/ui/CreatureSprite';

interface Props {
  userId: string | null;
  initialWater: WaterQueryData;
}

export function CreatureSection({ userId, initialWater }: Props) {
  const { creatureStage } = useWaterQuery({ userId, initialData: initialWater });
  const stage = Math.min(creatureStage, 9) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

  return (
    <div className="flex flex-col items-center gap-md py-lg">
      <div data-guide="creature.stage" className="relative flex flex-col items-center justify-center bg-surface-container-high border border-outline-variant p-md image-pixelated">
        <CreatureSprite stage={stage} size={128} />
        <span className="mt-xs font-mono text-label text-outline uppercase tracking-wider">
          {STAGE_LABELS[stage]} · Lv.{stage + 1}
        </span>
      </div>
    </div>
  );
}
