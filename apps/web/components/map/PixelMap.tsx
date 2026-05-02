'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePixelMapData } from '@/hooks/usePixelMapData';
import { useActivityStream } from '@/hooks/useActivityStream';
import { regionOf, regionDisplayName } from '@makeforest/types';

const PIXEL_SIZE = 4;
const MAX_COUNT = 20;
const HOVER_DELAY_MS = 500;
const HL_ALPHA_MAX = 0.34;

const SEA_COLOR = '#b4cdd8';
const SOIL_COLOR = '#707972';

export interface RegionBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export { regionOf };


function dongColor(count: number): string {
  if (count === 0) return SOIL_COLOR;
  const t = Math.min(count / MAX_COUNT, 1);
  const l = 81 - t * 56;
  return `hsl(148,60%,${l.toFixed(0)}%)`;
}

const STAGE_EMOJIS = ['🌱', '🌿', '🌳', '🌲', '🌲'] as const;

interface CreatureData { stage: number; waterCount: number; }
const creatureCache = new Map<string, CreatureData>();

interface TooltipStats {
  stage: string;
  water: number;
  totalUsers: number;
}

interface HoverLabel {
  regionCode: string;
  displayName: string;
  x: number;
  y: number;
}

interface PixelMapProps {
  onRegionClick: (regionCode: string, bounds: RegionBounds) => void;
}

export function PixelMap({ onRegionClick }: PixelMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: pixelMap, loading } = usePixelMapData();
  const activity = useActivityStream();

  const [hoverLabel, setHoverLabel] = useState<HoverLabel | null>(null);
  const [tooltipStats, setTooltipStats] = useState<TooltipStats | null>(null);

  // ── 지역 메타데이터 (pixelMap 변경 시만 재계산) ──────────────────────
  const regionMeta = useMemo(() => {
    const cells = new Map<string, typeof pixelMap.cells>();
    const bounds = new Map<string, RegionBounds>();
    const firstName = new Map<string, string>(); // sampleName

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

  // 활성도 집계 (activity 변경 시 재계산)
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

  // ── 캔버스 하이라이트 애니메이션 ─────────────────────────────────────
  const hlRegionRef = useRef<string | null>(null); // 렌더할 지역
  const hlAlphaRef = useRef(0);
  const hlTargetRef = useRef(0);
  const hlAnimRef = useRef<number | null>(null);

  const renderRef = useRef<() => void>(() => {});

  const startHlAnim = useCallback(() => {
    if (hlAnimRef.current !== null) return; // 이미 실행 중 — 알아서 새 target에 수렴
    const step = () => {
      const diff = hlTargetRef.current - hlAlphaRef.current;
      if (Math.abs(diff) < 0.003) {
        hlAlphaRef.current = hlTargetRef.current;
        if (hlTargetRef.current === 0) hlRegionRef.current = null;
        renderRef.current();
        hlAnimRef.current = null;
        return;
      }
      hlAlphaRef.current += diff * 0.16; // ease-out
      renderRef.current();
      hlAnimRef.current = requestAnimationFrame(step);
    };
    hlAnimRef.current = requestAnimationFrame(step);
  }, []);

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
  }, [pixelMap.cells, activity, regionMeta.cells]);

  useEffect(() => { renderRef.current = render; }, [render]);

  useEffect(() => {
    const id = requestAnimationFrame(() => renderRef.current());
    return () => cancelAnimationFrame(id);
  }, [render]);

  // ── 호버 상태 ────────────────────────────────────────────────────────
  const activeRegionRef = useRef<string | null>(null); // 현재 마우스가 위치한 지역
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
    [],
  );

  const clearHover = useCallback(() => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    activeRegionRef.current = null;
    setHoverLabel(null);
    setTooltipStats(null);
    hlTargetRef.current = 0;
    startHlAnim();
  }, [startHlAnim]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = getCellFromEvent(e);
      if (!hit) { clearHover(); return; }
      const cell = gridMap.get(`${hit.cx},${hit.cy}`);
      if (!cell) { clearHover(); return; }

      const rc = regionOf(cell.code, cell.name);

      if (rc !== activeRegionRef.current) {
        // 새 지역 진입
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        activeRegionRef.current = rc;

        // 캔버스 하이라이트 즉시 전환 후 페이드인
        hlRegionRef.current = rc;
        hlTargetRef.current = HL_ALPHA_MAX;
        startHlAnim();

        // 지역명 즉시 표시
        const stats = regionStats.get(rc) ?? { totalUsers: 0, sampleName: cell.name };
        setHoverLabel({ regionCode: rc, displayName: regionDisplayName(rc, stats.sampleName), x: hit.screenX, y: hit.screenY });
        setTooltipStats(null);

        // 0.5초 후 상세 스탯
        hoverTimerRef.current = setTimeout(() => {
          hoverTimerRef.current = null;
          if (activeRegionRef.current !== rc) return;

          const cached = creatureCache.get(rc);
          if (cached) {
            setTooltipStats({
              stage: STAGE_EMOJIS[Math.min(cached.stage, 4)] as string,
              water: Math.min(cached.waterCount, 3),
              totalUsers: regionStats.get(rc)?.totalUsers ?? 0,
            });
            return;
          }

          fetch(`/api/creature/${encodeURIComponent(rc)}`)
            .then((res) => res.json())
            .then((data: { stage: number; waterCount: number }) => {
              creatureCache.set(rc, data);
              if (activeRegionRef.current !== rc) return;
              setTooltipStats({
                stage: STAGE_EMOJIS[Math.min(data.stage, 4)] as string,
                water: Math.min(data.waterCount, 3),
                totalUsers: regionStats.get(rc)?.totalUsers ?? 0,
              });
            })
            .catch(() => { /* 조용히 무시 — 지역명만 표시됨 */ });
        }, HOVER_DELAY_MS);
      } else {
        // 같은 지역 내 이동 — 라벨 위치만 갱신
        setHoverLabel((prev) => prev ? { ...prev, x: hit.screenX, y: hit.screenY } : null);
      }
    },
    [getCellFromEvent, gridMap, regionStats, clearHover, startHlAnim],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = getCellFromEvent(e);
      if (!hit) return;
      const cell = gridMap.get(`${hit.cx},${hit.cy}`);
      if (!cell) return;
      const rc = regionOf(cell.code, cell.name);
      const bounds = regionMeta.bounds.get(rc);
      if (!bounds || bounds.minX === Infinity) return;
      onRegionClick(rc, bounds);
    },
    [getCellFromEvent, gridMap, regionMeta.bounds, onRegionClick],
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

      {/* 호버 라벨 — transform 영향을 피하기 위해 portal로 body에 직접 렌더링 */}
      {hoverLabel && createPortal(
        <div
          key={hoverLabel.regionCode}
          className="pointer-events-none fixed z-[9999] animate-fade-in-up bg-inverse-surface px-2 py-1.5 font-mono text-label text-inverse-on-surface border border-outline"
          style={{ left: hoverLabel.x + 14, top: hoverLabel.y - 10 }}
        >
          <div className="font-medium">{hoverLabel.displayName}</div>
          {tooltipStats && (
            <div className="mt-0.5 text-xs animate-fade-in-up">
              <span className="text-primary-fixed">{tooltipStats.stage}</span>
              <span className="ml-1 text-outline-variant">
                {'💧'.repeat(tooltipStats.water)}{'🩶'.repeat(3 - tooltipStats.water)}
              </span>
              {tooltipStats.totalUsers > 0 && (
                <div className="mt-0.5 text-secondary-fixed">{tooltipStats.totalUsers}명 집중 중</div>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
