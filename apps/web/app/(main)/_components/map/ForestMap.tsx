'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePixelMapData } from '@/shared/hooks/usePixelMapData';
import { useActivityStore } from '@/shared/store';
import { UserOverlay } from './UserOverlay';
import { regionOf } from '@makeforest/types';

const PIXEL_SIZE = 4;
const SEA_COLOR = '#0e2318';
const INACTIVE_COLOR = '#707972';

// 활성도 + 브리딩 팩터 → 숲 색상
function forestColor(count: number, breathe: number): string {
  if (count === 0) return INACTIVE_COLOR;
  const t = Math.min(count / 20, 1);
  const l = 20 + t * 36 + breathe * 12;
  return `hsl(138,60%,${l.toFixed(0)}%)`;
}

interface ForestMapProps {
  regionCode: string;
  active: boolean;
}

export function ForestMap({ regionCode, active }: ForestMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: pixelMap } = usePixelMapData();
  const activity = useActivityStore((s) => s.activity);
  const activeUsers = useActivityStore((s) => s.activeUsers);

  const visibleCells = useMemo(
    () =>
      regionCode
        ? pixelMap.cells.filter((c) => regionOf(c.code, c.name) === regionCode)
        : pixelMap.cells,
    [pixelMap.cells, regionCode],
  );

  const regionUsers = useMemo(
    () => activeUsers.filter((u) => visibleCells.some((c) => c.code === u.dongCode)),
    [activeUsers, visibleCells],
  );

  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const breathe = 0.5 + 0.5 * Math.sin(timestamp / 900);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const cell of visibleCells) {
      const count = activity[cell.code] ?? 0;
      ctx.fillStyle = forestColor(count, breathe);
      ctx.fillRect(cell.x * PIXEL_SIZE, cell.y * PIXEL_SIZE, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
    }
  }, [visibleCells, activity]);

  const renderRef = useRef(render);
  useEffect(() => { renderRef.current = render; }, [render]);

  // 활성(forest 모드)일 때만 RAF 루프 실행
  useEffect(() => {
    if (!active) return;
    let id: number;
    const loop = (ts: number) => {
      renderRef.current(ts);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: SEA_COLOR }}>
      <canvas
        ref={canvasRef}
        width={pixelMap.w * PIXEL_SIZE}
        height={pixelMap.h * PIXEL_SIZE}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
      {active && (
        <UserOverlay users={regionUsers} mapW={pixelMap.w} mapH={pixelMap.h} />
      )}
    </div>
  );
}
