'use client';

import { Icon } from '@/components/ui/Icon';
import { CreatureSprite, STAGE_LABELS } from './CreatureSprite';

interface CreatureSectionProps {
  stage: 0 | 1 | 2 | 3 | 4;
  waterCount: number;
  canWater: boolean;
  onWater: () => void;
}

export function CreatureSection({ stage, waterCount, canWater, onWater }: CreatureSectionProps) {
  const MAX_WATER = 3;
  const allWatered = waterCount >= MAX_WATER;

  return (
    <div className="flex flex-col items-center gap-md py-lg">
      {/* 픽셀 아트 생명체 */}
      <div className="relative flex flex-col items-center justify-center bg-surface-container-high border border-outline-variant p-md image-pixelated">
        <CreatureSprite stage={stage} size={112} />
        <span className="mt-xs font-mono text-label text-outline uppercase tracking-wider">
          {STAGE_LABELS[stage]} · Lv.{stage + 1}
        </span>
      </div>

      {/* 물주기 현황: 최대 3회 */}
      {!allWatered ? (
        <>
          <div className="flex items-center gap-sm">
            {Array.from({ length: MAX_WATER }).map((_, i) => (
              <Icon
                key={i}
                name="water_drop"
                filled={i < waterCount}
                size={22}
                className={i < waterCount ? 'text-primary' : 'text-outline-variant'}
              />
            ))}
          </div>

          <button
            onClick={onWater}
            disabled={!canWater}
            className="flex items-center gap-sm px-xl py-md bg-primary-container text-on-primary font-mono text-headline border border-primary active:translate-y-px transition-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name="water_drop" filled size={20} />
            물 주기
          </button>
        </>
      ) : (
        <p className="font-mono text-label text-primary uppercase tracking-wider">
          오늘 물주기 완료! 🎉
        </p>
      )}
    </div>
  );
}
