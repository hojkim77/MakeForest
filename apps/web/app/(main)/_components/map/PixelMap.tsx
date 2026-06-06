'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePixelMapQuery } from '@/shared/hooks/queries/usePixelMapQuery';
import { useMapSnapshotQuery } from '@/shared/hooks/queries/useMapSnapshotQuery';
import { useCanvasHighlight } from '@/shared/hooks/useCanvasHighlight';
import { useRegionHover } from '@/shared/hooks/useRegionHover';
import { PixelMapTooltip } from './PixelMapTooltip';
import { regionOf } from '@makeforest/types';
import type { RegionBounds } from '@makeforest/types';

export type { RegionBounds };
export { regionOf };

const PIXEL_SIZE = 4;
const MAX_COUNT = 20;

// Island palette — aligned with islandUtils TIMES.day
const SKY_TOP = '#D4EAF5';
const SEA_BOTTOM = '#7FB8D8';

// Forest growth tiers: [face, edge] — 0=barren → 4=deep forest
const DONG_TILES: [face: string, edge: string][] = [
  ['#9E9989', '#7A7368'], // barren
  ['#8CC592', '#558562'], // sprout  (1-2 users)
  ['#74B07E', '#3A6B48'], // growing (3-7 users)
  ['#558562', '#2C5A37'], // dense   (8-15 users)
  ['#2C5A37', '#1B3A26'], // peak    (16+ users)
];
const DONG_TILE_FALLBACK: [string, string] = ['#9E9989', '#7A7368'];

function getDongTileIdx(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 7) return 2;
  if (count <= 15) return 3;
  return 4;
}

interface PixelMapProps {
  onRegionClick?: (regionCode: string, bounds: RegionBounds) => void;
  onBoundsReady?: (bounds: Map<string, RegionBounds>) => void;
}

export function PixelMap({ onRegionClick, onBoundsReady }: PixelMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: pixelMap, loading } = usePixelMapQuery();
  const { data: snapshot } = useMapSnapshotQuery();
  const activity = snapshot?.heatmap ?? {};

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

  useEffect(() => {
    onBoundsReady?.(regionMeta.bounds);
  }, [regionMeta.bounds, onBoundsReady]);

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

  const renderRef = useRef<() => void>(() => { });

  const { hlRegionRef, hlAlphaRef, enterRegion, leaveRegion } = useCanvasHighlight(renderRef);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Layer 1: sky→sea gradient background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, SKY_TOP);
    skyGrad.addColorStop(1, SEA_BOTTOM);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Layer 2+3: dong pixels with island tile depth (edge + face)
    const PS = PIXEL_SIZE;
    for (const cell of pixelMap.cells) {
      const count = Math.min(activity[cell.code] ?? 0, MAX_COUNT);
      const [face, edge] = DONG_TILES[getDongTileIdx(count)] ?? DONG_TILE_FALLBACK;
      const px = cell.x * PS;
      const py = cell.y * PS;
      // Edge (right+bottom 1px shadow)
      ctx.fillStyle = edge;
      ctx.fillRect(px, py, PS, PS);
      // Face (top-left 3×3)
      ctx.fillStyle = face;
      ctx.fillRect(px, py, PS - 1, PS - 1);
    }

    // Hover highlight
    if (hlRegionRef.current && hlAlphaRef.current > 0) {
      ctx.fillStyle = `rgba(140,197,146,${hlAlphaRef.current.toFixed(3)})`;
      for (const cell of regionMeta.cells.get(hlRegionRef.current) ?? []) {
        ctx.fillRect(cell.x * PS, cell.y * PS, PS - 1, PS - 1);
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
    <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: SEA_BOTTOM }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant text-label">
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
