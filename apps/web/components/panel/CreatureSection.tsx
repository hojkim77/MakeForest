'use client';

import { Icon } from '@/components/ui/Icon';

const STAGE_LABELS = ['씨앗', '새싹', '풀', '나무'] as const;
const STAGE_EMOJI = ['🌰', '🌱', '🌿', '🌳'] as const;

interface CreatureSectionProps {
  /** Evolution stage 0–3 */
  stage: 0 | 1 | 2 | 3;
  /** Number of waters given today (max 3) */
  waterCount: number;
  /** Whether the user can water right now */
  canWater: boolean;
  onWater: () => void;
}

export function CreatureSection({ stage, waterCount, canWater, onWater }: CreatureSectionProps) {
  const MAX_WATER = 3;
  const allWatered = waterCount >= MAX_WATER;

  return (
    <div className="flex flex-col items-center gap-md py-lg">
      {/* Creature display — replace inner content with sprite canvas/image */}
      <div className="relative w-56 h-56 flex flex-col items-center justify-center bg-surface-container-high border border-outline-variant image-pixelated">
        <span style={{ fontSize: 80, lineHeight: 1 }}>{STAGE_EMOJI[stage]}</span>
        <span className="absolute bottom-2 left-2 font-mono text-label text-outline uppercase tracking-wider">
          {STAGE_LABELS[stage]} · Lv.{stage + 1}
        </span>
      </div>

      {/* Water status */}
      <div className="flex items-center gap-sm">
        {Array.from({ length: MAX_WATER }).map((_, i) => (
          <Icon
            key={i}
            name="water_drop"
            filled={i < waterCount}
            size={20}
            className={i < waterCount ? 'text-primary' : 'text-outline-variant'}
          />
        ))}
      </div>

      {/* Water button */}
      {allWatered ? (
        <p className="font-mono text-label text-primary uppercase tracking-wider">
          오늘 물주기 완료! 🎉
        </p>
      ) : (
        <button
          onClick={onWater}
          disabled={!canWater}
          className="flex items-center gap-sm px-xl py-md bg-primary-container text-on-primary font-mono text-headline border border-primary active:translate-y-px transition-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon name="water_drop" filled size={20} />
          물 주기
        </button>
      )}
    </div>
  );
}
