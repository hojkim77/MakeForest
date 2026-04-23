'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapStore } from '@/store';
import { PixelMap } from './PixelMap';
import { ForestMap } from './ForestMap';

const CANVAS_W = 250 * 4; // 1000px
const CANVAS_H = 290 * 4; // 1160px
const INITIAL_SCALE = 0.75;
const MIN_SCALE = 0.2;
const MAX_SCALE = 8;
const FOREST_THRESHOLD = 0.55; // 이 scale 미만 → 숲 모드

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

export function MapContainer() {
  const { focusedDongCode, setMapMode } = useMapStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const [t, setT] = useState<Transform>({ scale: INITIAL_SCALE, tx: 0, ty: 0 });
  const isPixel = t.scale >= FOREST_THRESHOLD;

  // 최초 마운트 시 캔버스를 컨테이너 중앙에 배치
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setT({
      scale: INITIAL_SCALE,
      tx: (width - CANVAS_W * INITIAL_SCALE) / 2,
      ty: (height - CANVAS_H * INITIAL_SCALE) / 2,
    });
  }, []);

  // 모드 동기화
  useEffect(() => {
    setMapMode(isPixel ? 'pixel' : 'forest');
  }, [isPixel, setMapMode]);

  // 휠 줌 (커서 위치 기준)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;

    setT((prev) => {
      const newScale = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE);
      const r = newScale / prev.scale;
      return { scale: newScale, tx: cx - (cx - prev.tx) * r, ty: cy - (cy - prev.ty) * r };
    });
  }, []);

  // 드래그 패닝
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: MouseEvent) => {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setT((prev) => ({ ...prev, tx: prev.tx + dx, ty: prev.ty + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
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

  const mapTransform = `translate(${t.tx}px, ${t.ty}px) scale(${t.scale})`;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-inverse-surface cursor-grab active:cursor-grabbing select-none">
      {/* 공통 transform 래퍼 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: mapTransform,
          width: CANVAS_W,
          height: CANVAS_H,
        }}
      >
        {/* 숲 모드 */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: isPixel ? 0 : 1, pointerEvents: isPixel ? 'none' : 'auto' }}
        >
          <ForestMap dongCode={focusedDongCode ?? ''} />
        </div>

        {/* 픽셀 모드 */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: isPixel ? 1 : 0, pointerEvents: isPixel ? 'auto' : 'none' }}
        >
          <PixelMap />
        </div>
      </div>

      {/* 내 위치 버튼 */}
      <MyLocationButton onReset={() => {
        const el = containerRef.current;
        if (!el) return;
        const { width, height } = el.getBoundingClientRect();
        setT({ scale: INITIAL_SCALE, tx: (width - CANVAS_W * INITIAL_SCALE) / 2, ty: (height - CANVAS_H * INITIAL_SCALE) / 2 });
      }} />

      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 left-2 z-20 rounded bg-black/50 px-2 py-0.5 text-xs text-gray-400">
          scale {t.scale.toFixed(2)} · {isPixel ? 'pixel' : 'forest'}
        </div>
      )}
    </div>
  );
}

function MyLocationButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      onClick={onReset}
      className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-100 active:scale-95 transition-transform"
      title="전체 보기"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
      </svg>
    </button>
  );
}
