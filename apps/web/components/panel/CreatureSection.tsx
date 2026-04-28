'use client';

import { CreatureSprite, STAGE_LABELS } from './CreatureSprite';

interface CreatureSectionProps {
  stage: 0 | 1 | 2 | 3 | 4;
}

export function CreatureSection({ stage }: CreatureSectionProps) {
  return (
    <div className="flex flex-col items-center gap-md py-lg">
      <div className="relative flex flex-col items-center justify-center bg-surface-container-high border border-outline-variant p-md image-pixelated">
        <CreatureSprite stage={stage} size={112} />
        <span className="mt-xs font-mono text-label text-outline uppercase tracking-wider">
          {STAGE_LABELS[stage]} · Lv.{stage + 1}
        </span>
      </div>
    </div>
  );
}
