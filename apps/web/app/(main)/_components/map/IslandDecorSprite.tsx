'use client';

import { ForestSprite, SPR_FLOWER_R, SPR_FLOWER_Y, SPR_GRASS } from './ForestSprite';
import type { DecorSlot, IslandPalette } from './islandUtils';

interface IslandDecorSpriteProps {
  decor: DecorSlot;
  T: IslandPalette;
  wind: boolean;
}

export function IslandDecorSprite({ decor, T, wind }: IslandDecorSpriteProps) {
  const swayDur = (2.6 + decor.sway * 1.8).toFixed(2);
  const swayDelay = (decor.sway * 2.5).toFixed(2);

  if (decor.type === 'pebble') {
    return (
      <div
        style={{
          position: 'absolute',
          left: decor.x,
          top: decor.y,
          transform: 'translate(-50%, -50%)',
          width: 12,
          height: 8,
          borderRadius: '50%',
          background: T.soilDk,
          opacity: 0.55,
        }}
      />
    );
  }

  const spr = decor.type === 'flowerR' ? SPR_FLOWER_R : decor.type === 'flowerY' ? SPR_FLOWER_Y : SPR_GRASS;
  const scale = decor.type === 'grass' ? 2.4 : 3;

  return (
    <div
      style={{
        position: 'absolute',
        left: decor.x,
        top: decor.y,
        transform: 'translate(-50%, -90%)',
        transformOrigin: 'bottom center',
        animation: wind ? `fm-sway ${swayDur}s ease-in-out ${swayDelay}s infinite` : 'none',
      }}
    >
      <ForestSprite
        data={spr}
        scale={scale}
        filter={T.night ? 'brightness(0.7)' : undefined}
      />
    </div>
  );
}
