'use client';

import { useState } from 'react';
import { IslandTreeSprite } from './IslandTreeSprite';
import { IslandDecorSprite } from './IslandDecorSprite';
import { IslandTooltip } from './IslandTooltip';
import type { Feature, IslandPalette, TreeSlot } from './islandUtils';

interface HoverState {
  tree: TreeSlot;
  x: number;
  y: number;
}

interface IslandFeaturesProps {
  features: Feature[];
  T: IslandPalette;
  wind?: boolean;
  water?: boolean;
}

export function IslandFeatures({ features, T, wind = true, water = false }: IslandFeaturesProps) {
  const [hovered, setHovered] = useState<HoverState | null>(null);

  const onHover = (tree: TreeSlot, node: HTMLElement) => {
    const r = node.getBoundingClientRect();
    setHovered({ tree, x: r.left + r.width / 2, y: r.top - 12 });
  };

  return (
    <>
      {/* Painter-sorted features (back → front by y) */}
      {features.map((f) =>
        f.kind === 'tree' ? (
          <IslandTreeSprite
            key={f.id}
            tree={f}
            T={T}
            wind={wind}
            water={water}
            onHover={onHover}
            onLeave={() => setHovered(null)}
          />
        ) : (
          <IslandDecorSprite key={f.id} decor={f} T={T} wind={wind} />
        ),
      )}

      {/* Hover tooltip (portaled to body) */}
      {hovered && typeof document !== 'undefined' && (
        <IslandTooltip tree={hovered.tree} x={hovered.x} y={hovered.y} />
      )}
    </>
  );
}
