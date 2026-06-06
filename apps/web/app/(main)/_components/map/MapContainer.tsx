'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMapStore } from '@/shared/store';
import { useMapSnapshotQuery } from '@/shared/hooks/queries/useMapSnapshotQuery';
import { usePixelPanZoom } from '@/shared/hooks/usePixelPanZoom';
import { PixelMap, type RegionBounds } from './PixelMap';
import { ForestMap } from './ForestMap';
import { MyLocationButton } from './MyLocationButton';

const CANVAS_W = 250 * 4;
const CANVAS_H = 290 * 4;

function coverScale(vw: number, vh: number) {
  return Math.max(vw / CANVAS_W, vh / CANVAS_H);
}

interface ForestState {
  regionCode: string;
  bounds: RegionBounds;
}

export function MapContainer() {
  useMapSnapshotQuery();
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user?.id;
  const myRegionCode = (session?.user?.regionCode ?? null) as string | null;
  const { setMapMode, focusRegion, focusedRegionCode } = useMapStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const boundsMapRef = useRef<Map<string, RegionBounds> | null>(null);

  const [forestState, setForestState] = useState<ForestState | null>(null);

  const isForest = forestState !== null;
  const isForestRef = useRef(false);
  useEffect(() => { isForestRef.current = isForest; }, [isForest]);

  const { pixelT, setPixelT, minScaleRef, suppressNextClick, constrainPixelT } = usePixelPanZoom({
    containerRef,
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
    isForestRef,
  });

  // ── 뷰포트 초기화 및 리사이즈 대응 ──────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const min = coverScale(width, height);
      minScaleRef.current = min;
      setPixelT((prev) => {
        const s = Math.max(prev.scale, min);
        return constrainPixelT({ ...prev, scale: s }, width, height);
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minScaleRef, setPixelT, constrainPixelT]);

  // ── 모드 동기화 ────────────────────────────────────────────────────
  useEffect(() => {
    setMapMode(isForest ? 'forest' : 'pixel');
  }, [isForest, setMapMode]);

  // ── 시/군 클릭 → 숲 모드 진입 ────────────────────────────────────
  const handleRegionClick = useCallback((regionCode: string, bounds: RegionBounds) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    setForestState({ regionCode, bounds });
    focusRegion(regionCode);
  }, [suppressNextClick, focusRegion]);

  // ── 전체 보기 리셋 ─────────────────────────────────────────────────
  const resetView = useCallback(() => {
    setForestState(null);
    focusRegion(null);
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPixelT(constrainPixelT({ scale: minScaleRef.current, tx: 0, ty: 0 }, width, height));
  }, [focusRegion, setPixelT, constrainPixelT, minScaleRef]);

  // ── focusedRegionCode 변화 → 숲 모드 진입 or 픽셀 복귀 ──────────
  useEffect(() => {
    if (focusedRegionCode === null) {
      setForestState(null);
      const el = containerRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      setPixelT((prev) => constrainPixelT(prev, width, height));
    } else if (forestState?.regionCode !== focusedRegionCode) {
      const bounds = boundsMapRef.current?.get(focusedRegionCode);
      if (!bounds) return;
      setForestState({ regionCode: focusedRegionCode, bounds });
    }
  }, [focusedRegionCode, forestState?.regionCode, setPixelT, constrainPixelT]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-inverse-surface select-none ${
        isForest ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* Pixel map with its own pan/zoom transform */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isForest ? 0 : 1,
          pointerEvents: isForest ? 'none' : 'auto',
          transformOrigin: '0 0',
          transform: `translate(${pixelT.tx}px,${pixelT.ty}px) scale(${pixelT.scale})`,
          width: CANVAS_W,
          height: CANVAS_H,
        }}
      >
        <PixelMap
          {...(isLoggedIn ? { onRegionClick: handleRegionClick } : {})}
          onBoundsReady={(m) => { boundsMapRef.current = m; }}
        />
      </div>

      {/* Island forest map — fills viewport directly, no canvas scale */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ opacity: isForest ? 1 : 0, pointerEvents: isForest ? 'auto' : 'none' }}
      >
        <ForestMap regionCode={forestState?.regionCode ?? ''} active={isForest} />
      </div>

      <MyLocationButton
        onReset={resetView}
        isForest={isForest}
        {...(myRegionCode ? { onGoHome: () => focusRegion(myRegionCode) } : {})}
      />

      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 left-2 z-map-ui bg-black/50 px-2 py-0.5 font-mono text-label text-gray-400">
          scale {pixelT.scale.toFixed(2)} · {isForest ? `forest:${forestState?.regionCode}` : 'pixel'}
        </div>
      )}
    </div>
  );
}

