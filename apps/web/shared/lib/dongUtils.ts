import aliasMap from '../../public/dong-alias.json';
import pixelMap from '../../public/pixel-map.json';

const alias = aliasMap as Record<string, string>;

export const dongNameMap: Record<string, string> = Object.fromEntries(
  (pixelMap as { cells: { code: string; name: string }[] }).cells.map((c) => [c.code, c.name]),
);

export function normalizeDongCode(raw: string): string {
  return alias[raw] ?? raw;
}

export function getDongName(code: string): string | undefined {
  return dongNameMap[code];
}
