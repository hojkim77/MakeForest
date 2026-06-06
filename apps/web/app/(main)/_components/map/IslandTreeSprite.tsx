'use client';

import { ForestSprite, SPR_PERSON, SPR_DROP } from './ForestSprite';
import { TREE_H, treeImgSrc } from './islandUtils';
import type { TreeSlot, IslandPalette } from './islandUtils';

interface IslandTreeSpriteProps {
  tree: TreeSlot;
  T: IslandPalette;
  wind: boolean;
  water: boolean;
  onHover: (tree: TreeSlot, node: HTMLElement) => void;
  onLeave: () => void;
}

export function IslandTreeSprite({ tree, T, wind, water, onHover, onLeave }: IslandTreeSpriteProps) {
  if (!tree.user) return null;

  const stage = Math.max(0, Math.min(9, tree.user.creatureStage));
  const h = TREE_H[stage] ?? 92;
  const swayDur = (3.4 + tree.sway * 2.2).toFixed(2);
  const swayDelay = (tree.sway * 3).toFixed(2);

  return (
    <>
      {/* Tree + shadow + ring */}
      <div
        style={{
          position: 'absolute',
          left: tree.x,
          top: tree.y,
          transform: 'translate(-50%, -100%)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => onHover(tree, e.currentTarget as HTMLElement)}
        onMouseLeave={onLeave}
      >
        {/* Elliptical ground shadow */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -6,
            transform: 'translateX(-50%)',
            width: h * 0.62,
            height: h * 0.20,
            background: 'rgba(20,35,22,0.26)',
            borderRadius: '50%',
            filter: 'blur(1px)',
          }}
        />

        {/* Active focus ring (pulsing) */}
        {tree.active && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: -10,
              width: h * 0.7,
              height: h * 0.24,
              borderRadius: '50%',
              border: `2px solid ${T.night ? '#B0F1CA' : '#2D7A52'}`,
              animation: 'fm-pulse 2.2s ease-out infinite',
            }}
          />
        )}

        {/* Tree PNG */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={treeImgSrc(stage)}
          alt={`나무 ${stage}단계`}
          style={{
            height: h,
            width: 'auto',
            display: 'block',
            transform: `scaleX(${tree.flip ? -1 : 1})`,
            transformOrigin: 'bottom center',
            animation: wind ? `fm-sway ${swayDur}s ease-in-out ${swayDelay}s infinite` : 'none',
            imageRendering: 'pixelated',
            filter: T.night
              ? 'brightness(0.74) saturate(0.85)'
              : T.overlay !== 'transparent'
                ? 'brightness(0.96) saturate(1.05)'
                : undefined,
          }}
        />

        {/* Night lantern on active trees */}
        {tree.active && T.night && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: h * 0.4,
              transform: 'translateX(-50%)',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#FFD27F',
              boxShadow: '0 0 10px 4px rgba(255,210,127,0.7)',
              animation: 'fm-glow 2.4s ease-in-out infinite',
            }}
          />
        )}

        {/* Watering drops on active trees */}
        {tree.active && water && [0, 1].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${42 + i * 18}%`,
              top: -4,
              animation: `fm-fly 1.7s ${(tree.sway + i * 0.5).toFixed(2)}s ease-in infinite`,
            }}
          >
            <ForestSprite data={SPR_DROP} scale={2} />
          </div>
        ))}
      </div>

      {/* Person sitting at base of active trees (rendered separately for z-ordering) */}
      {tree.active && (
        <div
          style={{
            position: 'absolute',
            left: tree.x + h * 0.30,
            top: tree.y,
            transform: 'translate(-50%, -46%)',
            pointerEvents: 'none',
          }}
        >
          <ForestSprite data={SPR_PERSON} scale={2.4} filter="drop-shadow(2px 3px 0 rgba(20,35,22,0.22))" />
        </div>
      )}
    </>
  );
}
