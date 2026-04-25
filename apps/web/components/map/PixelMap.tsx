'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMapStore } from '@/store';
import { usePixelMapData } from '@/hooks/usePixelMapData';
import { useActivityStream } from '@/hooks/useActivityStream';

const PIXEL_SIZE = 4;
const MAX_COUNT = 20;
const HOVER_DELAY_MS = 1000;

const SEA_COLOR = '#b4cdd8';
const SOIL_COLOR = '#707972';

// 오늘의 생명체 단계 — 실제 API 연결 전까지 코드 해시로 결정
const STAGES = ['🌱', '🌿', '🌳', '🌲'] as const;

function dongColor(count: number): string {
  if (count === 0) return SOIL_COLOR;
  const t = Math.min(count / MAX_COUNT, 1);
  const l = 81 - t * 56;
  return `hsl(148,60%,${l.toFixed(0)}%)`;
}

function hashCode(s: string): number {
  return s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

interface Tooltip {
  x: number;
  y: number;
  name: string;
  count: number;
  stage: string;
  water: number;
}

export function PixelMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { focusDong } = useMapStore();
  const { data: pixelMap, loading } = usePixelMapData();
  const activity = useActivityStream();
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredCodeRef = useRef<string | null>(null);
  const pendingRef = useRef<Tooltip | null>(null);

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
      // canvas.width/rect.width = 1/scale → viewport px → CSS px (parent space)
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cssX = (e.clientX - rect.left) * scaleX;
      const cssY = (e.clientY - rect.top) * scaleY;
      const cx = Math.floor(cssX / PIXEL_SIZE);
      const cy = Math.floor(cssY / PIXEL_SIZE);
      return { cx, cy, cssX, cssY };
    },
    [],
  );

  const clearHover = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    hoveredCodeRef.current = null;
    pendingRef.current = null;
    setTooltip(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = getCellFromEvent(e);
      if (!hit) { clearHover(); return; }
      const cell = gridMap.get(`${hit.cx},${hit.cy}`);
      if (!cell) { clearHover(); return; }

      const h = hashCode(cell.code);
      const next: Tooltip = {
        x: hit.cssX,
        y: hit.cssY,
        name: cell.name,
        count: activity[cell.code] ?? 0,
        stage: STAGES[h % 4] as string,
        water: h % 4,
      };

      if (cell.code !== hoveredCodeRef.current) {
        // 새로운 동 진입 → 타이머 리셋
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoveredCodeRef.current = cell.code;
        pendingRef.current = next;
        setTooltip(null);
        hoverTimerRef.current = setTimeout(() => {
          setTooltip(pendingRef.current);
          hoverTimerRef.current = null;
        }, HOVER_DELAY_MS);
      } else {
        // 같은 동 위에서 마우스 이동 → 포지션만 업데이트
        pendingRef.current = next;
        setTooltip((prev) => (prev ? { ...prev, x: hit.cssX, y: hit.cssY } : null));
      }
    },
    [getCellFromEvent, gridMap, activity, clearHover],
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
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 bg-inverse-surface px-2 py-1.5 font-mono text-label text-inverse-on-surface border border-outline"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <div className="font-medium">{tooltip.name}</div>
          <div className="mt-0.5 text-xs">
            <span className="text-primary-fixed">{tooltip.stage}</span>
            <span className="ml-1 text-outline-variant">{'💧'.repeat(tooltip.water)}{'🩶'.repeat(3 - tooltip.water)}</span>
          </div>
          {tooltip.count > 0 && (
            <div className="mt-0.5 text-xs text-secondary-fixed">{tooltip.count}명 집중 중</div>
          )}
        </div>
      )}
    </div>
  );
}
