'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapStore } from '@/store';
import { PixelMap } from './PixelMap';
import { ForestMap } from './ForestMap';

const CANVAS_W = 250 * 4;   // 1000 canvas-px
const CANVAS_H = 290 * 4;   // 1160 canvas-px
const MAX_SCALE = 4;
const FOREST_THRESHOLD = 1.5; // scale < threshold → pixel mode (전국 조감); ≥ threshold → forest mode (시/구 줌인)

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

interface Transform { scale: number; tx: number; ty: number }

/** Minimum scale that makes the canvas cover the entire viewport (CSS background-size: cover). */
function coverScale(vw: number, vh: number) {
  return Math.max(vw / CANVAS_W, vh / CANVAS_H);
}

/**
 * Clamp tx/ty so the canvas never exposes the background.
 * On an axis where the canvas is smaller than the viewport, center it instead.
 */
function constrain({ scale, tx, ty }: Transform, vw: number, vh: number): Transform {
  const sw = CANVAS_W * scale;
  const sh = CANVAS_H * scale;
  return {
    scale,
    tx: sw <= vw ? (vw - sw) / 2 : clamp(tx, vw - sw, 0),
    ty: sh <= vh ? (vh - sh) / 2 : clamp(ty, vh - sh, 0),
  };
}

export function MapContainer() {
  const { focusedDongCode, setMapMode } = useMapStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Stored in a ref so wheel/drag handlers remain stable across re-renders
  const minScaleRef = useRef(0.1);

  const [t, setT] = useState<Transform>({ scale: 0.1, tx: 0, ty: 0 });
  const isForest = t.scale >= FOREST_THRESHOLD;
  const isPixel = !isForest;

  // ── Fill viewport at minimum zoom; re-constrain on resize ────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const min = coverScale(width, height);
      minScaleRef.current = min;
      setT((prev) => constrain({ ...prev, scale: clamp(prev.scale, min, MAX_SCALE) }, width, height));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Forest ↔ Pixel mode sync ─────────────────────────────────────────
  useEffect(() => {
    setMapMode(isForest ? 'forest' : 'pixel');
  }, [isForest, setMapMode]);

  // ── Wheel zoom (cursor-centric) ───────────────────────────────────────
  // No external deps: reads minScaleRef directly, gets viewport from getBoundingClientRect.
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const cx = e.clientX - left;
    const cy = e.clientY - top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;

    setT((prev) => {
      const s = clamp(prev.scale * factor, minScaleRef.current, MAX_SCALE);
      const r = s / prev.scale;
      return constrain({ scale: s, tx: cx - (cx - prev.tx) * r, ty: cy - (cy - prev.ty) * r }, width, height);
    });
  }, []);

  // ── Drag pan ──────────────────────────────────────────────────────────
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: MouseEvent) => {
    dragging.current = true;
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
    setT((prev) => constrain({ ...prev, tx: prev.tx + dx, ty: prev.ty + dy }, width, height));
  }, []);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  // ── Wire events (runs once — all handlers are stable) ────────────────
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

  // ── Reset to full-country view ────────────────────────────────────────
  const resetView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setT(constrain({ scale: minScaleRef.current, tx: 0, ty: 0 }, width, height));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-inverse-surface cursor-grab active:cursor-grabbing select-none"
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
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: isForest ? 1 : 0, pointerEvents: isForest ? 'auto' : 'none' }}
        >
          <ForestMap dongCode={focusedDongCode ?? ''} />
        </div>
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: isPixel ? 1 : 0, pointerEvents: isPixel ? 'auto' : 'none' }}
        >
          <PixelMap />
        </div>
      </div>

      <MyLocationButton onReset={resetView} />

      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 left-2 z-20 bg-black/50 px-2 py-0.5 font-mono text-label text-gray-400">
          scale {t.scale.toFixed(2)} · {isForest ? 'forest' : 'pixel'}
        </div>
      )}
    </div>
  );
}

function MyLocationButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      onClick={onReset}
      className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center bg-surface border border-outline-variant hover:bg-surface-container-high active:scale-95 transition-transform"
      title="전체 보기"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
      </svg>
    </button>
  );
}
