'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMapStore } from '@/shared/store';
import { useMapSnapshotQuery } from '@/shared/hooks/queries/useMapSnapshotQuery';
import { usePixelPanZoom } from '@/shared/hooks/usePixelPanZoom';
import { PixelMap, type RegionBounds } from './PixelMap';
import { ForestMap } from './ForestMap';
import { GcMonitorOverlay } from './GcMonitorOverlay';
import { MyLocationButton } from './MyLocationButton';

const CANVAS_W = 250 * 4;
const CANVAS_H = 290 * 4;
const PIXEL_SIZE = 4;

function coverScale(vw: number, vh: number) {
  return Math.max(vw / CANVAS_W, vh / CANVAS_H);
}

function computeForestTransform(bounds: RegionBounds, vw: number, vh: number) {
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
  useMapSnapshotQuery();
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user?.id;
  const myRegionCode = (session?.user?.regionCode ?? null) as string | null;
  const { setMapMode, focusRegion, focusedRegionCode } = useMapStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const boundsMapRef = useRef<Map<string, RegionBounds> | null>(null);

  const [forestState, setForestState] = useState<ForestState | null>(null);
  const [forestT, setForestT] = useState({ scale: 1, tx: 0, ty: 0 });

  const isForest = forestState !== null;
  const isForestRef = useRef(false);
  useEffect(() => { isForestRef.current = isForest; }, [isForest]);

  const { pixelT, setPixelT, minScaleRef, suppressNextClick, constrainPixelT } = usePixelPanZoom({
    containerRef,
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
    isForestRef,
  });

  const t = isForest ? forestT : pixelT;

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
      setForestState((prev) => {
        if (prev) setForestT(computeForestTransform(prev.bounds, width, height));
        return prev;
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
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setForestT(computeForestTransform(bounds, width, height));
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
      const el = containerRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      setForestT(computeForestTransform(bounds, width, height));
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
          <ForestMap regionCode={forestState?.regionCode ?? ''} active={isForest} scale={forestT.scale} />
        </div>
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: isForest ? 0 : 1, pointerEvents: isForest ? 'none' : 'auto' }}
        >
          <PixelMap
            {...(isLoggedIn ? { onRegionClick: handleRegionClick } : {})}
            onBoundsReady={(m) => { boundsMapRef.current = m; }}
          />
        </div>
      </div>

      <MyLocationButton
        onReset={resetView}
        isForest={isForest}
        {...(myRegionCode ? { onGoHome: () => focusRegion(myRegionCode) } : {})}
      />

      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 left-2 z-map-ui bg-black/50 px-2 py-0.5 font-mono text-label text-gray-400">
          scale {t.scale.toFixed(2)} · {isForest ? `forest:${forestState?.regionCode}` : 'pixel'}
        </div>
      )}
      {process.env.NODE_ENV === 'development' && isForest && <GcMonitorOverlay />}
    </div>
  );
}

