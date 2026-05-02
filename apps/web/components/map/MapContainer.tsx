'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapStore } from '@/store';
import { PixelMap, type RegionBounds } from './PixelMap';
import { ForestMap } from './ForestMap';

const CANVAS_W = 250 * 4;
const CANVAS_H = 290 * 4;
const MAX_SCALE = 8;
const PIXEL_SIZE = 4; // ForestMap/PixelMap과 동일해야 함

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

interface Transform { scale: number; tx: number; ty: number }

function coverScale(vw: number, vh: number) {
  return Math.max(vw / CANVAS_W, vh / CANVAS_H);
}

function constrain({ scale, tx, ty }: Transform, vw: number, vh: number): Transform {
  const sw = CANVAS_W * scale;
  const sh = CANVAS_H * scale;
  return {
    scale,
    tx: sw <= vw ? (vw - sw) / 2 : clamp(tx, vw - sw, 0),
    ty: sh <= vh ? (vh - sh) / 2 : clamp(ty, vh - sh, 0),
  };
}

function computeForestTransform(bounds: RegionBounds, vw: number, vh: number): Transform {
  const regionW = (bounds.maxX - bounds.minX + 1) * PIXEL_SIZE;
  const regionH = (bounds.maxY - bounds.minY + 1) * PIXEL_SIZE;
  const scale = Math.min(vw / regionW, vh / regionH) * 0.92;
  const cx = (bounds.minX + (bounds.maxX - bounds.minX + 1) / 2) * PIXEL_SIZE;
  const cy = (bounds.minY + (bounds.maxY - bounds.minY + 1) / 2) * PIXEL_SIZE;
  return { scale, tx: vw / 2 - cx * scale, ty: vh / 2 - cy * scale };
}

interface ForestState {
  regionCode: string;
  bounds: RegionBounds;
}

export function MapContainer() {
  const { setMapMode, focusRegion, focusedRegionCode } = useMapStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const minScaleRef = useRef(0.1);

  // 픽셀 모드 pan/zoom transform
  const [pixelT, setPixelT] = useState<Transform>({ scale: 0.1, tx: 0, ty: 0 });

  // 숲 모드 상태 (null = 픽셀 모드)
  const [forestState, setForestState] = useState<ForestState | null>(null);
  const [forestT, setForestT] = useState<Transform>({ scale: 1, tx: 0, ty: 0 });

  const isForest = forestState !== null;
  const t = isForest ? forestT : pixelT;

  // 모드 전환을 ref로 보관 — 이벤트 핸들러가 항상 최신값 참조
  const isForestRef = useRef(false);
  useEffect(() => { isForestRef.current = isForest; }, [isForest]);

  // ── 뷰포트 초기화 및 리사이즈 대응 ─────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const min = coverScale(width, height);
      minScaleRef.current = min;
      setPixelT((prev) => constrain({ ...prev, scale: clamp(prev.scale, min, MAX_SCALE) }, width, height));
      // 숲 모드 중 리사이즈 → transform 재계산
      setForestState((prev) => {
        if (prev) setForestT(computeForestTransform(prev.bounds, width, height));
        return prev;
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── 모드 동기화 ────────────────────────────────────────────────────
  useEffect(() => {
    setMapMode(isForest ? 'forest' : 'pixel');
  }, [isForest, setMapMode]);

  // ── 휠 줌 (픽셀 모드 전용) ──────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    if (isForestRef.current) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const cx = e.clientX - left;
    const cy = e.clientY - top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setPixelT((prev) => {
      const s = clamp(prev.scale * factor, minScaleRef.current, MAX_SCALE);
      const r = s / prev.scale;
      return constrain({ scale: s, tx: cx - (cx - prev.tx) * r, ty: cy - (cy - prev.ty) * r }, width, height);
    });
  }, []);

  // ── 드래그 이동 (픽셀 모드 전용) ─────────────────────────────────────
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const suppressNextClick = useRef(false);

  const DRAG_THRESHOLD = 5; // px — 이 이상 이동하면 드래그로 판정

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (isForestRef.current) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPixelT((prev) => constrain({ ...prev, tx: prev.tx + dx, ty: prev.ty + dy }, width, height));
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (dragging.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        // 드래그였음 — 뒤따라오는 click 이벤트를 억제
        suppressNextClick.current = true;
        setTimeout(() => { suppressNextClick.current = false; }, 50);
      }
    }
    dragging.current = false;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp]);

  // ── 시/군 클릭 → 숲 모드 진입 + 패널 동기화 ──────────────────────────
  const handleRegionClick = useCallback((regionCode: string, bounds: RegionBounds) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setForestT(computeForestTransform(bounds, width, height));
    setForestState({ regionCode, bounds });
    focusRegion(regionCode);
  }, [focusRegion]);

  // ── 전체 보기 리셋 + 패널 동기화 ─────────────────────────────────────
  const resetView = useCallback(() => {
    setForestState(null);
    focusRegion(null);
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPixelT(constrain({ scale: minScaleRef.current, tx: 0, ty: 0 }, width, height));
  }, [focusRegion]);

  // ── 패널 "내 동네로 돌아가기" → 맵도 픽셀 모드로 복귀 ──────────────
  useEffect(() => {
    if (focusedRegionCode === null) {
      setForestState(null);
      const el = containerRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      setPixelT((prev) => constrain(prev, width, height));
    }
  }, [focusedRegionCode]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-inverse-surface select-none ${
        isForest ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: `translate(${t.tx}px,${t.ty}px) scale(${t.scale})`,
          width: CANVAS_W,
          height: CANVAS_H,
        }}
      >
        {/* 숲 모드: 선택 시/군 영역만, 브리딩 애니메이션 */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: isForest ? 1 : 0, pointerEvents: isForest ? 'auto' : 'none' }}
        >
          <ForestMap regionCode={forestState?.regionCode ?? ''} active={isForest} />
        </div>
        {/* 픽셀 모드: 전국 조감, 시/군 단위 호버 */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: isForest ? 0 : 1, pointerEvents: isForest ? 'none' : 'auto' }}
        >
          <PixelMap onRegionClick={handleRegionClick} />
        </div>
      </div>

      <MyLocationButton onReset={resetView} isForest={isForest} />

      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 left-2 z-20 bg-black/50 px-2 py-0.5 font-mono text-label text-gray-400">
          scale {t.scale.toFixed(2)} · {isForest ? `forest:${forestState?.regionCode}` : 'pixel'}
        </div>
      )}
    </div>
  );
}

function MyLocationButton({ onReset, isForest }: { onReset: () => void; isForest: boolean }) {
  return (
    <button
      onClick={onReset}
      className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center bg-surface border border-outline-variant hover:bg-surface-container-high active:scale-95 transition-transform"
      title={isForest ? '전체 보기로 돌아가기' : '전체 보기'}
    >
      {isForest ? (
        // 뒤로가기 아이콘 (숲 모드)
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
      ) : (
        // 위치 핀 아이콘 (픽셀 모드)
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
        </svg>
      )}
    </button>
  );
}
