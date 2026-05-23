'use client';

import { useWaterStore } from '@/shared/store';
import { CreatureSprite, STAGE_LABELS } from '@/shared/components/ui/CreatureSprite';

export function CreatureSection() {
  const stage = useWaterStore((s) => s.creatureStage);

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
