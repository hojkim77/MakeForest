// Character-indexed pixel-art SVG renderer for ForestMap sprites.
// Palette from /Users/skylar/Downloads/makeforest/project/sprites.jsx

const P: Record<string, string> = {
  C: '#F2EBDB', c: '#E5DBC2', P: '#EFE7D2', p: '#D9C9A8',
  k: '#2A2D26', K: '#1A1B17', n: '#5A5547',
  D: '#1B3A26', d: '#2D5F3F', g: '#4F8B5C', l: '#7BB084', L: '#A8C9A8', m: '#CDDDC4',
  B: '#7A4A2B', b: '#A87856', E: '#4E2F1C', e: '#5C3920',
  W: '#5B8BBF', w: '#A8C5DD', V: '#2F5478',
  S: '#E5B45C', s: '#F0CC85', Y: '#F8DCA0',
  R: '#C46647', r: '#7B3D2A',
  H: '#BFB8A4', h: '#8C8775', i: '#A09A86',
  X: '#FFD27F', x: '#3A4250',
  F: '#EBC4A0', f: '#C99672',
  O: '#FFFFFF', o: '#EDE4D2',
};

interface ForestSpriteProps {
  data: string[];
  scale?: number;
  style?: React.CSSProperties;
  filter?: string | undefined;
}

export function ForestSprite({ data, scale = 4, style, filter }: ForestSpriteProps) {
  const h = data.length;
  const w = data.reduce((m, r) => Math.max(m, r.length), 0);
  return (
    <svg
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', imageRendering: 'pixelated', filter, ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {data.flatMap((row, y) =>
        [...row].flatMap((ch, x) => {
          const fill = P[ch];
          if (!fill) return [];
          return [<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />];
        }),
      )}
    </svg>
  );
}

// ── Sprite definitions ─────────────────────────────────────────────────

export const SPR_CLOUD = [
  '...OOOO.........',
  '..OOoooO........',
  '.OOoooooOO..OOO.',
  'OOoooooooOOOOooO',
  '.Ooooooooooooo..',
  '..OOOOOOOOOOO...',
];

export const SPR_SUN = [
  '....SSSS....',
  '..SSsssSS...',
  '.SssssssS...',
  '.SsYYYYsS...',
  'SssYYYYssS..',
  'SssYYYYssS..',
  'SssYYYYssS..',
  '.SsYYYYsS...',
  '.SssssssS...',
  '..SSsssSS...',
  '....SSSS....',
];

export const SPR_BIRD = ['D..D', '.DD.'];

export const SPR_FLOWER_R = ['.s.', 'sRs', '.g.', '.g.'];
export const SPR_FLOWER_Y = ['.O.', 'OSO', '.g.', '.g.'];

export const SPR_GRASS = [
  '..g..g..',
  '.gLgggLg',
  'gLLLgLLL',
  'ggggggdg',
];

export const SPR_PERSON = [
  '....FFFF......',
  '...FppppF.....',
  '...FppppF.....',
  '....FFFF......',
  '....kdkk......',
  '...kdddk......',
  '..kddddkk.....',
  '.kdddddkkk....',
  '.kddddkkkkk...',
  '.kkdddkk......',
  '..k..kk.......',
  '..k..k........',
  '..k..k........',
  '..k..k........',
];

export const SPR_DROP = [
  '..ww..',
  '..wW..',
  '.wWWw.',
  'wWWWWw',
  'wWWWWw',
  'wWWVWw',
  '.WVVVw',
  '..wWw.',
];
