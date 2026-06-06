'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePixelMapQuery } from '@/shared/hooks/queries/usePixelMapQuery';
import { useMapSnapshotQuery } from '@/shared/hooks/queries/useMapSnapshotQuery';
import { regionOf } from '@makeforest/types';
import {
  getTimeOfDay,
  TIMES,
  buildIslandShapeFromCells,
  buildIslandWorld,
  bindUsersToFeatures,
  buildAmbient,
  worldSize,
} from './islandUtils';
import { SkyLayer } from './SkyLayer';
import { IslandGround } from './IslandGround';
import { IslandFeatures } from './IslandFeatures';

interface ForestMapProps {
  regionCode: string;
  active: boolean;
}

export function ForestMap({ regionCode, active }: ForestMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [islandScale, setIslandScale] = useState(0);

  const { data: pixelMap } = usePixelMapQuery();
  const { data: snapshot } = useMapSnapshotQuery();
  const activeUsers = snapshot?.users ?? [];

  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const T = TIMES[timeOfDay];

  const visibleCells = useMemo(
    () => regionCode
      ? pixelMap.cells.filter((c) => regionOf(c.code, c.name) === regionCode)
      : pixelMap.cells,
    [pixelMap.cells, regionCode],
  );

  const regionUsers = useMemo(
    () => activeUsers.filter((u) => visibleCells.some((c) => c.code === u.dongCode)),
    [activeUsers, visibleCells],
  );

  const shape = useMemo(() => buildIslandShapeFromCells(visibleCells), [visibleCells]);

  const density = regionUsers.filter(u => u.sessionStatus === 'RUNNING').length;

  const world = useMemo(
    () => buildIslandWorld(regionCode, density, shape, regionUsers.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regionCode, density, shape, regionUsers.length],
  );

  const features = useMemo(
    () => bindUsersToFeatures(world.features, regionUsers),
    [world.features, regionUsers],
  );

  const ambient = useMemo(() => buildAmbient(), []);

  const { WORLD_W, WORLD_H } = worldSize(shape);

  // Fit island to container
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setIslandScale(Math.min((width - 24) / WORLD_W, (height - 24) / WORLD_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [WORLD_W, WORLD_H, active]);

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: T.sky,
        transition: 'background 0.6s ease',
      }}
    >
      {/* Mood overlay (sunset / night tint) */}
      {T.overlay !== 'transparent' && (
        <div
          style={{ position: 'absolute', inset: 0, background: T.overlay, pointerEvents: 'none', zIndex: 1 }}
        />
      )}

      {/* Sky ambient elements (stars, clouds, sun, birds, moon) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <SkyLayer T={T} ambient={ambient} />
      </div>

      {/* Island world (centered, internally scaled) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: WORLD_W,
            height: WORLD_H,
            transform: `scale(${islandScale})`,
            position: 'relative',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <IslandGround shape={shape} T={T} pondCell={world.pondCell} />
          <IslandFeatures features={features} T={T} wind={true} />
        </div>
      </div>

      {/* Fireflies (night, above world) */}
      {T.night && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
          {ambient.flies.map((fl, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${fl.top}%`,
                left: `${fl.left}%`,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#FFE89A',
                boxShadow: '0 0 8px 3px rgba(255,232,154,0.8)',
                ['--fm-dx' as string]: `${fl.dx}px`,
                ['--fm-dy' as string]: `${fl.dy}px`,
                animation: `fm-fly ${fl.dur.toFixed(2)}s ease-in-out ${fl.delay.toFixed(2)}s infinite`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
