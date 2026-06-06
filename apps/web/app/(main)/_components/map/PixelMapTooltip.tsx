'use client';

import { createPortal } from 'react-dom';
import type { HoverLabel, TooltipStats } from '@/shared/hooks/useRegionHover';

interface PixelMapTooltipProps {
  hoverLabel: HoverLabel | null;
  tooltipStats: TooltipStats | null;
}

export function PixelMapTooltip({ hoverLabel, tooltipStats }: PixelMapTooltipProps) {
  if (!hoverLabel) return null;

  return createPortal(
    <div
      key={hoverLabel.regionCode}
      className="pointer-events-none fixed z-tooltip animate-fade-in-up bg-inverse-surface px-2 py-1.5 font-mono text-label text-inverse-on-surface border-2 border-outline shadow-island"
      style={{ left: hoverLabel.x + 14, top: hoverLabel.y - 10 }}
    >
      <div className="font-medium">{hoverLabel.displayName}</div>
      {tooltipStats && (
        <div className="mt-0.5 text-label animate-fade-in-up">
          집중 {tooltipStats.userCount}명 / 물주기 총 {tooltipStats.totalWaterCount}회
        </div>
      )}
    </div>,
    document.body,
  );
}
