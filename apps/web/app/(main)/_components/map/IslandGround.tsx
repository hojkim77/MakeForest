'use client';

import { CELL, THICK, worldSize } from './islandUtils';
import type { IslandPalette, IslandShape } from './islandUtils';

interface IslandGroundProps {
  shape: IslandShape;
  T: IslandPalette;
  pondCell: [number, number] | null;
}

export function IslandGround({ shape, T, pondCell }: IslandGroundProps) {
  const { LX, LY } = worldSize(shape);
  const isLand = (r: number, c: number) => shape.grid[r]?.[c] === true;

  const grassCells: React.ReactNode[] = [];
  const soilCells: React.ReactNode[] = [];

  for (let r = 0; r < shape.ROWS; r++) {
    for (let c = 0; c < shape.COLS; c++) {
      if (!isLand(r, c)) continue;
      const x = LX + c * CELL;
      const y = LY + r * CELL;

      soilCells.push(
        <div
          key={`s${r}-${c}`}
          style={{
            position: 'absolute',
            left: x,
            top: y + THICK,
            width: CELL,
            height: CELL,
            background: T.soilDk,
            borderBottom: !isLand(r + 1, c) ? `4px solid ${T.soil}` : 'none',
            boxSizing: 'border-box',
          }}
        />,
      );

      grassCells.push(
        <div
          key={`g${r}-${c}`}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: CELL,
            height: CELL,
            background: T.grass,
            boxShadow: `inset 0 7px 0 ${T.grassHi}, inset 0 -9px 0 ${T.grassDk}`,
            borderTop: !isLand(r - 1, c) ? `4px solid ${T.edge}` : 'none',
            borderBottom: !isLand(r + 1, c) ? `4px solid ${T.edge}` : 'none',
            borderLeft: !isLand(r, c - 1) ? `4px solid ${T.edge}` : 'none',
            borderRight: !isLand(r, c + 1) ? `4px solid ${T.edge}` : 'none',
            boxSizing: 'border-box',
          }}
        />,
      );
    }
  }

  return (
    <>
      {/* Soil layer (behind grass, offset down by THICK for extrusion effect) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          filter: `drop-shadow(0 ${THICK + 10}px 14px rgba(20,30,20,0.28))`,
        }}
      >
        {soilCells}
      </div>

      {/* Grass layer */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {grassCells}
      </div>

      {/* Pond */}
      {pondCell && (
        <div
          style={{
            position: 'absolute',
            left: LX + pondCell[1] * CELL + 14,
            top: LY + pondCell[0] * CELL + 18,
            width: CELL - 28,
            height: CELL - 40,
            background: T.water,
            boxShadow: `inset 0 6px 0 ${T.waterDk}, inset 0 -6px 0 rgba(255,255,255,0.18)`,
            borderRadius: '40% 50% 45% 55%',
          }}
        >
          <div style={{ position: 'absolute', left: 12, top: 10, width: 18, height: 5, background: 'rgba(255,255,255,0.5)', borderRadius: 4 }} />
        </div>
      )}
    </>
  );
}
