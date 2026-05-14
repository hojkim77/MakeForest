import { useCallback, useRef, useState } from 'react';
import { regionOf, regionDisplayName } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';

const HOVER_DELAY_MS = 500;

const PIXEL_SIZE = 4;

interface RegionAggregate {
  totalWaterCount: number;
}

const creatureCache = new Map<string, RegionAggregate>();

export interface HoverLabel {
  regionCode: string;
  displayName: string;
  x: number;
  y: number;
}

export interface TooltipStats {
  userCount: number;
  totalWaterCount: number;
}

interface UseRegionHoverOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gridMap: Map<string, { code: string; name: string }>;
  regionStats: Map<string, { totalUsers: number; sampleName: string }>;
  onRegionEnter: (rc: string) => void;
  onRegionLeave: () => void;
}

export function useRegionHover({
  canvasRef,
  gridMap,
  regionStats,
  onRegionEnter,
  onRegionLeave,
}: UseRegionHoverOptions) {
  const [hoverLabel, setHoverLabel] = useState<HoverLabel | null>(null);
  const [tooltipStats, setTooltipStats] = useState<TooltipStats | null>(null);

  const activeRegionRef = useRef<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        cx: Math.floor((e.clientX - rect.left) * scaleX / PIXEL_SIZE),
        cy: Math.floor((e.clientY - rect.top) * scaleY / PIXEL_SIZE),
        screenX: e.clientX,
        screenY: e.clientY,
      };
    },
    [canvasRef],
  );

  const clearHover = useCallback(() => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    activeRegionRef.current = null;
    setHoverLabel(null);
    setTooltipStats(null);
    onRegionLeave();
  }, [onRegionLeave]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = getCellFromEvent(e);
      if (!hit) { clearHover(); return; }
      const cell = gridMap.get(`${hit.cx},${hit.cy}`);
      if (!cell) { clearHover(); return; }

      const rc = regionOf(cell.code, cell.name);

      if (rc !== activeRegionRef.current) {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        activeRegionRef.current = rc;

        onRegionEnter(rc);

        const stats = regionStats.get(rc) ?? { totalUsers: 0, sampleName: cell.name };
        setHoverLabel({ regionCode: rc, displayName: regionDisplayName(rc, stats.sampleName), x: hit.screenX, y: hit.screenY });
        setTooltipStats(null);

        hoverTimerRef.current = setTimeout(() => {
          hoverTimerRef.current = null;
          if (activeRegionRef.current !== rc) return;

          const cached = creatureCache.get(rc);
          if (cached) {
            setTooltipStats({ userCount: regionStats.get(rc)?.totalUsers ?? 0, totalWaterCount: cached.totalWaterCount });
            return;
          }

          api.get<RegionAggregate>(API_PATHS.SERVER_CREATURE(rc))
            .then((data) => {
              creatureCache.set(rc, data);
              if (activeRegionRef.current !== rc) return;
              setTooltipStats({ userCount: regionStats.get(rc)?.totalUsers ?? 0, totalWaterCount: data.totalWaterCount });
            })
            .catch(() => {});
        }, HOVER_DELAY_MS);
      } else {
        setHoverLabel((prev) => prev ? { ...prev, x: hit.screenX, y: hit.screenY } : null);
      }
    },
    [getCellFromEvent, gridMap, regionStats, clearHover, onRegionEnter],
  );

  return { hoverLabel, tooltipStats, handleMouseMove, clearHover };
}
