'use client';

import { createPortal } from 'react-dom';
import { STAGE_LABEL } from './islandUtils';
import type { TreeSlot } from './islandUtils';

interface IslandTooltipProps {
  tree: TreeSlot;
  x: number;
  y: number;
}

export function IslandTooltip({ tree, x, y }: IslandTooltipProps) {
  if (!tree.user) return null;
  const u = tree.user;
  const stage = Math.max(0, Math.min(9, u.creatureStage)) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

  return createPortal(
    <div
      className="pointer-events-none fixed z-tooltip"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
    >
      <div className="bg-surface border-2 border-outline shadow-island px-[10px] py-[7px] whitespace-nowrap min-w-[126px]">
        {/* Name + active indicator + stage badge */}
        <div className="flex items-center gap-[6px] mb-[4px]">
          <span
            className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${tree.active ? 'animate-fm-blink bg-primary' : 'bg-outline-variant'}`}
          />
          <span className="text-[11px] font-extrabold text-outline">{u.nickname}</span>
          <span className="font-mono text-[7px] font-bold bg-primary text-on-primary px-[4px] py-[1px]">
            {STAGE_LABEL[stage]}
          </span>
        </div>

        {/* Focus status */}
        <div className="text-[9px] font-semibold text-on-surface">
          {tree.active ? '집중 중' : '오늘 완료'}
        </div>

        {/* Water count */}
        <div className="font-mono text-[8px] text-primary mt-[1px]">
          💧 {u.todayWaterCount}/{u.segmentCount}회
        </div>

        {/* Today goal */}
        {u.todayGoal && (
          <div className="text-[8px] text-on-surface-variant mt-[3px] max-w-[154px] whitespace-normal">
            &ldquo;{u.todayGoal}&rdquo;
          </div>
        )}

        {/* Neighborhood rank */}
        <div className="font-mono text-[8px] text-outline-variant mt-[2px]">
          #{u.neighborhoodRank}위
        </div>
      </div>
      {/* Pointer stem */}
      <div className="w-[1px] h-[7px] bg-outline mx-auto" />
    </div>,
    document.body,
  );
}
