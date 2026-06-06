import type { DongPixel } from '@/shared/hooks/queries/usePixelMapQuery';
import type { MapUser } from '@makeforest/types';

// ── Types ──────────────────────────────────────────────────────────────

export type TimeOfDay = 'day' | 'sunset' | 'night';

export interface IslandPalette {
  sky: string;
  grass: string; grassHi: string; grassDk: string;
  soil: string; soilDk: string; edge: string;
  overlay: string; water: string; waterDk: string;
  night: boolean;
}

export interface IslandShape {
  grid: boolean[][];
  COLS: number;
  ROWS: number;
}

export interface TreeSlot {
  id: string;
  x: number; y: number;
  flip: boolean; sway: number;
  user: MapUser | null;
  active: boolean;
}

export interface DecorSlot {
  id: string;
  x: number; y: number;
  sway: number;
  type: 'grass' | 'flowerR' | 'flowerY' | 'pebble';
}

export type Feature =
  | (TreeSlot & { kind: 'tree' })
  | (DecorSlot & { kind: 'decor' });

export interface IslandWorld {
  features: Feature[];
  pondCell: [number, number] | null;
}

export interface AmbientSky {
  clouds: { top: number; scale: number; dur: number; delay: number; op: number }[];
  birds: { top: number; dur: number; delay: number; scale: number }[];
  stars: { top: number; left: number; s: number; d: number; delay: number }[];
  flies: { top: number; left: number; dur: number; delay: number; dx: number; dy: number }[];
}

// ── Geometry ───────────────────────────────────────────────────────────

export const CELL = 108;
export const PAD_X = 56;
export const PAD_TOP = 172;
export const PAD_BOT = 40;
export const THICK = 16;
const MAX_DIM = 15;
const MAX_DENSITY = 30;

export function worldSize(shape: IslandShape) {
  return {
    WORLD_W: PAD_X * 2 + shape.COLS * CELL,
    WORLD_H: PAD_TOP + shape.ROWS * CELL + PAD_BOT,
    LX: PAD_X,
    LY: PAD_TOP,
  };
}

// Tree render heights per creatureStage (0-9) in world pixels.
// Proportionally derived from actual grow_NN.png heights (108→513px range), capped at 152.
export const TREE_H: Record<number, number> = {
  0: 56,   // grow_01.png (108px)
  1: 56,   // grow_02.png (117px)
  2: 56,   // grow_03.png (126px)
  3: 56,   // grow_04.png (153px)
  4: 74,   // grow_05.png (207px)
  5: 90,   // grow_06.png (252px)
  6: 112,  // grow_07.png (315px)
  7: 130,  // grow_08.png (369px)
  8: 152,  // grow_09.png (450px)
  9: 152,  // grow_10.png (513px) — capped to keep world tree in bounds
};

export function treeImgSrc(creatureStage: number): string {
  const s = Math.max(0, Math.min(9, creatureStage));
  return `/images/forest/grow_${String(s + 1).padStart(2, '0')}.png`;
}

export const STAGE_LABEL = ['씨앗', '새싹', '나무1', '나무2', '나무3', '고목', '노거수', '정령수', '신수', '세계수'] as const;

// ── Time-of-day palettes ───────────────────────────────────────────────

export const TIMES: Record<TimeOfDay, IslandPalette> = {
  day: {
    sky: 'linear-gradient(180deg,#9FD3EC 0%,#BEE3EF 42%,#D9EEDD 78%,#E7F2DF 100%)',
    grass: '#74B07E', grassHi: '#8CC592', grassDk: '#558562',
    soil: '#7A4A2B', soilDk: '#5A3A22', edge: '#2C5A37',
    overlay: 'transparent', water: '#7FB8D8', waterDk: '#4E8FB8',
    night: false,
  },
  sunset: {
    sky: 'linear-gradient(180deg,#5A3A6E 0%,#A85C7A 32%,#E89A66 64%,#F4C98A 100%)',
    grass: '#6E9A6E', grassHi: '#8AB47E', grassDk: '#4C7050',
    soil: '#6E4226', soilDk: '#4A2E1B', edge: '#2A4A34',
    overlay: 'rgba(240,150,80,0.16)', water: '#C98EA8', waterDk: '#9A5F7E',
    night: false,
  },
  night: {
    sky: 'linear-gradient(180deg,#0C1730 0%,#162546 52%,#1F3358 100%)',
    grass: '#33523E', grassHi: '#436B4F', grassDk: '#243B2D',
    soil: '#4A3220', soilDk: '#2E2014', edge: '#16301F',
    overlay: 'rgba(20,34,74,0.30)', water: '#3A6890', waterDk: '#24486A',
    night: true,
  },
};

export function getTimeOfDay(): TimeOfDay {
  const h = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
  ).getHours();
  return h >= 6 && h < 18 ? 'day' : h < 20 ? 'sunset' : 'night';
}

// ── RNG ───────────────────────────────────────────────────────────────

export function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Island shape from dong pixels ────────────────────────────────────

export function buildIslandShapeFromCells(cells: DongPixel[]): IslandShape {
  if (cells.length === 0) {
    return { grid: [[true, true, true], [true, true, true], [true, true, true]], COLS: 3, ROWS: 3 };
  }
  const xs = cells.map(c => c.x);
  const ys = cells.map(c => c.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rawW = maxX - minX + 1;
  const rawH = maxY - minY + 1;
  const scale = MAX_DIM / Math.max(rawW, rawH);
  const COLS = Math.max(5, Math.round(rawW * scale));
  const ROWS = Math.max(5, Math.round(rawH * scale));

  const landSet = new Set<string>();
  for (const cell of cells) {
    const col = rawW > 1
      ? Math.round((cell.x - minX) / (rawW - 1) * (COLS - 1))
      : Math.round((COLS - 1) / 2);
    const row = rawH > 1
      ? Math.round((cell.y - minY) / (rawH - 1) * (ROWS - 1))
      : Math.round((ROWS - 1) / 2);
    landSet.add(`${row},${col}`);
  }

  // Dilate to fill gaps created by scaling sparse source pixels up to a larger grid.
  // dilationR approaches 0 as scale approaches 1 (dense regions like Seoul need none).
  const dilationR = Math.max(0, Math.ceil((scale - 1) / 2));
  if (dilationR > 0) {
    const original = [...landSet];
    for (const key of original) {
      const [kr, kc] = key.split(',').map(Number);
      for (let dr = -dilationR; dr <= dilationR; dr++) {
        for (let dc = -dilationR; dc <= dilationR; dc++) {
          const nr = kr + dr, nc = kc + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            landSet.add(`${nr},${nc}`);
          }
        }
      }
    }
  }

  const grid = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => landSet.has(`${r},${c}`)),
  );
  return { grid, COLS, ROWS };
}

// ── World generation ──────────────────────────────────────────────────

export function buildIslandWorld(
  regionCode: string,
  density: number,
  shape: IslandShape,
  userCount: number,
): IslandWorld {
  const { LX, LY } = worldSize(shape);
  const seed = hashStr(regionCode) + density * 97;
  const rng = mulberry32(seed);

  const landCells: [number, number][] = [];
  for (let r = 0; r < shape.ROWS; r++) {
    for (let c = 0; c < shape.COLS; c++) {
      if (shape.grid[r]?.[c]) landCells.push([r, c]);
    }
  }

  const interior = landCells.filter(([r, c]) =>
    shape.grid[r - 1]?.[c] && shape.grid[r + 1]?.[c] &&
    shape.grid[r]?.[c - 1] && shape.grid[r]?.[c + 1],
  );
  const pondCell = interior.length
    ? (interior[Math.floor(rng() * interior.length)] ?? null)
    : null;

  const slots: { x: number; y: number; k: number }[] = [];
  for (const [r, c] of landCells) {
    if (pondCell && r === pondCell[0] && c === pondCell[1]) continue;
    for (const sy of [0.30, 0.72]) {
      for (const sx of [0.30, 0.72]) {
        const jx = (rng() - 0.5) * CELL * 0.26;
        const jy = (rng() - 0.5) * CELL * 0.26;
        slots.push({ x: LX + (c + sx) * CELL + jx, y: LY + (r + sy) * CELL + jy, k: rng() });
      }
    }
  }
  slots.sort((a, b) => a.k - b.k);

  const treeCount = Math.min(userCount, slots.length);
  const remainingCount = slots.length - treeCount;
  const decorRatio = 0.30 + 0.40 * Math.min(density / MAX_DENSITY, 1);
  const decorCount = Math.round(remainingCount * decorRatio);

  const treeSlots: TreeSlot[] = [];
  const decorSlots: DecorSlot[] = [];

  slots.forEach((s, i) => {
    const flip = rng() > 0.5;
    const sway = rng();
    if (i < treeCount) {
      treeSlots.push({ id: `t${i}`, x: s.x, y: s.y, flip, sway, user: null, active: false });
    } else if (i - treeCount < decorCount) {
      const dq = rng();
      const type: DecorSlot['type'] = dq < 0.62 ? 'grass' : dq < 0.78 ? 'flowerR' : dq < 0.90 ? 'flowerY' : 'pebble';
      decorSlots.push({ id: `d${i}`, x: s.x, y: s.y, sway, type });
    }
  });

  const features: Feature[] = [
    ...treeSlots.map(t => ({ ...t, kind: 'tree' as const })),
    ...decorSlots.map(d => ({ ...d, kind: 'decor' as const })),
  ].sort((a, b) => a.y - b.y);

  return { features, pondCell };
}

// ── User → tree slot binding ──────────────────────────────────────────

export function bindUsersToFeatures(features: Feature[], users: MapUser[]): Feature[] {
  const sorted = [...users].sort((a, b) => b.creatureStage - a.creatureStage);
  let ui = 0;
  return features.map(f => {
    if (f.kind !== 'tree') return f;
    const user = sorted[ui++] ?? null;
    return { ...f, user, active: user?.sessionStatus === 'RUNNING' ? true : false };
  });
}

// ── Ambient sky elements ──────────────────────────────────────────────

export function buildAmbient(): AmbientSky {
  const rng = mulberry32(77);
  return {
    clouds: Array.from({ length: 4 }, () => ({
      top: 40 + rng() * 220,
      scale: 3.5 + rng() * 3,
      dur: 48 + rng() * 40,
      delay: -rng() * 60,
      op: 0.6 + rng() * 0.35,
    })),
    birds: Array.from({ length: 3 }, () => ({
      top: 70 + rng() * 160,
      dur: 22 + rng() * 16,
      delay: -rng() * 30,
      scale: 3 + rng() * 2,
    })),
    stars: Array.from({ length: 60 }, () => ({
      top: rng() * 55,
      left: rng() * 100,
      s: 1 + rng() * 2,
      d: 2 + rng() * 3,
      delay: rng() * 3,
    })),
    flies: Array.from({ length: 22 }, () => ({
      top: 30 + rng() * 60,
      left: 8 + rng() * 84,
      dur: 6 + rng() * 6,
      delay: rng() * 6,
      dx: (rng() - 0.5) * 60,
      dy: (rng() - 0.5) * 50,
    })),
  };
}
