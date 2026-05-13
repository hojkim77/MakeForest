'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePixelMapData } from '@/hooks/usePixelMapData';
import { useActivityStore } from '@/store';
import { useCanvasHighlight } from '@/hooks/useCanvasHighlight';
import { useRegionHover } from '@/hooks/useRegionHover';
import { PixelMapTooltip } from './PixelMapTooltip';
import { regionOf } from '@makeforest/types';
import type { RegionBounds } from '@makeforest/types';

export type { RegionBounds };
export { regionOf };

const PIXEL_SIZE = 4;
const MAX_COUNT = 20;
const SEA_COLOR = '#b4cdd8';
const SOIL_COLOR = '#707972';

function dongColor(count: number): string {
  if (count === 0) return SOIL_COLOR;
  const t = Math.min(count / MAX_COUNT, 1);
  const l = 81 - t * 56;
  return `hsl(148,60%,${l.toFixed(0)}%)`;
}

interface PixelMapProps {
  onRegionClick?: (regionCode: string, bounds: RegionBounds) => void;
}

export function PixelMap({ onRegionClick }: PixelMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: pixelMap, loading } = usePixelMapData();
  const activity = useActivityStore((s) => s.activity);

  const regionMeta = useMemo(() => {
    const cells = new Map<string, typeof pixelMap.cells>();
    const bounds = new Map<string, RegionBounds>();
    const firstName = new Map<string, string>();

    for (const cell of pixelMap.cells) {
      const rc = regionOf(cell.code, cell.name);
      if (!cells.has(rc)) {
        cells.set(rc, []);
        firstName.set(rc, cell.name);
      }
      cells.get(rc)!.push(cell);

      const b = bounds.get(rc) ?? { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
      bounds.set(rc, {
        minX: Math.min(b.minX, cell.x),
        maxX: Math.max(b.maxX, cell.x),
        minY: Math.min(b.minY, cell.y),
        maxY: Math.max(b.maxY, cell.y),
      });
    }
    return { cells, bounds, firstName };
  }, [pixelMap.cells]);

  const regionStats = useMemo(() => {
    const m = new Map<string, { totalUsers: number; sampleName: string }>();
    for (const [rc, cellList] of regionMeta.cells) {
      let total = 0;
      for (const c of cellList) total += activity[c.code] ?? 0;
      m.set(rc, { totalUsers: total, sampleName: regionMeta.firstName.get(rc) ?? '' });
    }
    return m;
  }, [regionMeta, activity]);

  const gridMap = useMemo(() => {
    const m = new Map<string, { code: string; name: string }>();
    for (const cell of pixelMap.cells) m.set(`${cell.x},${cell.y}`, cell);
    return m;
  }, [pixelMap]);

  const renderRef = useRef<() => void>(() => {});

  const { hlRegionRef, hlAlphaRef, enterRegion, leaveRegion } = useCanvasHighlight(renderRef);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const cell of pixelMap.cells) {
      ctx.fillStyle = dongColor(activity[cell.code] ?? 0);
      ctx.fillRect(cell.x * PIXEL_SIZE, cell.y * PIXEL_SIZE, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
    }

    if (hlRegionRef.current && hlAlphaRef.current > 0) {
      ctx.fillStyle = `rgba(180,255,200,${hlAlphaRef.current.toFixed(3)})`;
      for (const cell of regionMeta.cells.get(hlRegionRef.current) ?? []) {
        ctx.fillRect(cell.x * PIXEL_SIZE, cell.y * PIXEL_SIZE, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
      }
    }
  }, [pixelMap.cells, activity, regionMeta.cells, hlRegionRef, hlAlphaRef]);

  useEffect(() => { renderRef.current = render; }, [render]);

  useEffect(() => {
    const id = requestAnimationFrame(() => renderRef.current());
    return () => cancelAnimationFrame(id);
  }, [render]);

  const { hoverLabel, tooltipStats, handleMouseMove, clearHover } = useRegionHover({
    canvasRef,
    gridMap,
    regionStats,
    onRegionEnter: enterRegion,
    onRegionLeave: leaveRegion,
  });

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = Math.floor((e.clientX - rect.left) * scaleX / PIXEL_SIZE);
      const cy = Math.floor((e.clientY - rect.top) * scaleY / PIXEL_SIZE);
      const cell = gridMap.get(`${cx},${cy}`);
      if (!cell) return;
      const rc = regionOf(cell.code, cell.name);
      const bounds = regionMeta.bounds.get(rc);
      if (!bounds || bounds.minX === Infinity) return;
      onRegionClick?.(rc, bounds);
    },
    [gridMap, regionMeta.bounds, onRegionClick],
  );

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: SEA_COLOR }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          지도 로딩 중…
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={pixelMap.w * PIXEL_SIZE}
        height={pixelMap.h * PIXEL_SIZE}
        className="w-full h-full cursor-crosshair"
        style={{ imageRendering: 'pixelated' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={clearHover}
        onClick={handleClick}
      />
      <PixelMapTooltip hoverLabel={hoverLabel} tooltipStats={tooltipStats} />
    </div>
  );
}
