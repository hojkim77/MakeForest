'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMapStore } from '@/store';
import { usePixelMapData } from '@/hooks/usePixelMapData';
import { useActivityStream } from '@/hooks/useActivityStream';

const PIXEL_SIZE = 4;
const MAX_COUNT = 20;

function dongColor(count: number): string {
  if (count === 0) return '#374151';
  const lightness = 30 + Math.min(count / MAX_COUNT, 1) * 30;
  return `hsl(142,76%,${lightness.toFixed(0)}%)`;
}

interface Tooltip {
  x: number;
  y: number;
  name: string;
  count: number;
}

export function PixelMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { focusDong } = useMapStore();
  const { data: pixelMap, loading } = usePixelMapData();
  const activity = useActivityStream();
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  // (x, y) → cell 역산 맵
  const gridMap = useMemo(() => {
    const m = new Map<string, { code: string; name: string }>();
    for (const cell of pixelMap.cells) m.set(`${cell.x},${cell.y}`, cell);
    return m;
  }, [pixelMap]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const cell of pixelMap.cells) {
      const count = activity[cell.code] ?? 0;
      ctx.fillStyle = dongColor(count);
      ctx.fillRect(cell.x * PIXEL_SIZE, cell.y * PIXEL_SIZE, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
    }
  }, [pixelMap, activity]);

  useEffect(() => {
    const id = requestAnimationFrame(render);
    return () => cancelAnimationFrame(id);
  }, [render]);

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cx = Math.floor(((e.clientX - rect.left) * (canvas.width / rect.width)) / PIXEL_SIZE);
      const cy = Math.floor(((e.clientY - rect.top) * (canvas.height / rect.height)) / PIXEL_SIZE);
      return { cx, cy, screenX: e.clientX - rect.left, screenY: e.clientY - rect.top };
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = getCellFromEvent(e);
      if (!hit) return;
      const cell = gridMap.get(`${hit.cx},${hit.cy}`);
      if (cell) {
        setTooltip({ x: hit.screenX, y: hit.screenY, name: cell.name, count: activity[cell.code] ?? 0 });
      } else {
        setTooltip(null);
      }
    },
    [getCellFromEvent, gridMap, activity],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = getCellFromEvent(e);
      if (!hit) return;
      const cell = gridMap.get(`${hit.cx},${hit.cy}`);
      if (cell) focusDong(cell.code);
    },
    [getCellFromEvent, gridMap, focusDong],
  );

  return (
    <div className="relative w-full h-full bg-gray-950 overflow-hidden">
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
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        onClick={handleClick}
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <span className="font-medium">{tooltip.name}</span>
          {tooltip.count > 0 && (
            <span className="ml-1 text-green-400">{tooltip.count}명 집중 중</span>
          )}
        </div>
      )}
    </div>
  );
}
