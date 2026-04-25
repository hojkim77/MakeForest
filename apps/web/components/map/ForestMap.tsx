'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMapStore } from '@/store';
import { usePixelMapData } from '@/hooks/usePixelMapData';
import { useActivityStream } from '@/hooks/useActivityStream';

const PIXEL_SIZE = 4;
const HOVER_DELAY_MS = 1000;

// 숲 팔레트
const SEA_COLOR = '#0e2318';
const EMPTY_COLOR = '#2d1f0f'; // 황무지

// 활성도 기반 초록색 (어두운 숲 → 밝은 숲)
function forestColor(count: number): string {
  if (count === 0) return EMPTY_COLOR;
  const t = Math.min(count / 20, 1);
  const l = 18 + t * 38;
  return `hsl(138,55%,${l.toFixed(0)}%)`;
}

// 시/구 코드 (dongCode 앞 5자리)
function sigunguOf(code: string): string {
  return code.substring(0, 5);
}

const STAGES = ['🌱', '🌿', '🌳', '🌲'] as const;

function hashCode(s: string): number {
  return s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

interface Tooltip {
  x: number;
  y: number;
  sigunguCode: string;
  // 시/구 집계
  totalUsers: number;
  sampleDongName: string;
  stage: string;
  water: number;
}

interface ForestMapProps {
  dongCode: string;
}

export function ForestMap({ dongCode }: ForestMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { focusDong } = useMapStore();
  const { data: pixelMap } = usePixelMapData();
  const activity = useActivityStream();
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredSigunguRef = useRef<string | null>(null);
  const pendingRef = useRef<Tooltip | null>(null);

  // dongCode가 있으면 해당 시/구만, 없으면 전체 표시
  const focusedSigungu = dongCode ? sigunguOf(dongCode) : null;

  const visibleCells = useMemo(
    () =>
      focusedSigungu
        ? pixelMap.cells.filter((c) => c.code.startsWith(focusedSigungu))
        : pixelMap.cells,
    [pixelMap.cells, focusedSigungu],
  );

  // (x,y) → cell
  const gridMap = useMemo(() => {
    const m = new Map<string, (typeof pixelMap.cells)[0]>();
    for (const cell of visibleCells) m.set(`${cell.x},${cell.y}`, cell);
    return m;
  }, [visibleCells]);

  // 시/구 코드 → 집계 (사용자 수, 대표 동 이름)
  const sigunguStats = useMemo(() => {
    const stats = new Map<string, { totalUsers: number; sampleName: string }>();
    for (const cell of visibleCells) {
      const sg = sigunguOf(cell.code);
      const prev = stats.get(sg) ?? { totalUsers: 0, sampleName: cell.name };
      stats.set(sg, {
        totalUsers: prev.totalUsers + (activity[cell.code] ?? 0),
        sampleName: prev.sampleName,
      });
    }
    return stats;
  }, [visibleCells, activity]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const cell of visibleCells) {
      const count = activity[cell.code] ?? 0;
      ctx.fillStyle = forestColor(count);
      ctx.fillRect(cell.x * PIXEL_SIZE, cell.y * PIXEL_SIZE, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
    }
    // 호버 중인 시/구 하이라이트
    if (hoveredSigunguRef.current) {
      ctx.fillStyle = 'rgba(180,255,200,0.18)';
      for (const cell of visibleCells) {
        if (sigunguOf(cell.code) === hoveredSigunguRef.current) {
          ctx.fillRect(cell.x * PIXEL_SIZE, cell.y * PIXEL_SIZE, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
        }
      }
    }
  }, [visibleCells, activity]);

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

  const clearHover = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    hoveredSigunguRef.current = null;
    pendingRef.current = null;
    setTooltip(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = getCellFromEvent(e);
      if (!hit) { clearHover(); return; }
      const cell = gridMap.get(`${hit.cx},${hit.cy}`);
      if (!cell) { clearHover(); return; }

      const sg = sigunguOf(cell.code);
      const stats = sigunguStats.get(sg) ?? { totalUsers: 0, sampleName: cell.name };
      const h = hashCode(sg);

      const next: Tooltip = {
        x: hit.screenX,
        y: hit.screenY,
        sigunguCode: sg,
        totalUsers: stats.totalUsers,
        sampleDongName: stats.sampleName,
        stage: STAGES[h % 4] as string,
        water: h % 4,
      };

      if (sg !== hoveredSigunguRef.current) {
        // 새 시/구 진입
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoveredSigunguRef.current = sg;
        pendingRef.current = next;
        setTooltip(null);
        hoverTimerRef.current = setTimeout(() => {
          setTooltip(pendingRef.current);
          hoverTimerRef.current = null;
        }, HOVER_DELAY_MS);
      } else {
        // 같은 시/구 내 이동 → 포지션 업데이트
        pendingRef.current = next;
        setTooltip((prev) => (prev ? { ...prev, x: hit.screenX, y: hit.screenY } : null));
      }
    },
    [getCellFromEvent, gridMap, sigunguStats, clearHover],
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
          <div className="font-medium">{tooltip.sampleDongName} 일대</div>
          <div className="mt-0.5 text-xs">
            <span className="text-primary-fixed">{tooltip.stage}</span>
            <span className="ml-1 text-outline-variant">
              {'💧'.repeat(tooltip.water)}{'🩶'.repeat(3 - tooltip.water)}
            </span>
          </div>
          {tooltip.totalUsers > 0 && (
            <div className="mt-0.5 text-xs text-secondary-fixed">
              {tooltip.totalUsers}명 집중 중
            </div>
          )}
        </div>
      )}
    </div>
  );
}
