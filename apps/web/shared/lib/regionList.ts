import pixelMap from '../../public/pixel-map.json';

function extractCityCounty(fullName: string): string {
  const sigungu = fullName.split(' ')[1] ?? fullName;
  const siIdx = sigungu.indexOf('시');
  if (siIdx > 0 && siIdx < sigungu.length - 1) return sigungu.slice(0, siIdx + 1);
  return sigungu;
}

export interface RegionItem {
  regionKey: string;
  regionName: string;
}

let _list: RegionItem[] | null = null;

export function getRegionList(): RegionItem[] {
  if (_list) return _list;
  const map = new Map<string, string>();
  for (const cell of (pixelMap as { cells: { code: string; name: string }[] }).cells) {
    const regionName = extractCityCounty(cell.name);
    const key = `${cell.code.slice(0, 2)}:${regionName}`;
    if (!map.has(key)) map.set(key, regionName);
  }
  _list = [...map.entries()]
    .map(([key, name]) => ({ regionKey: key, regionName: name }))
    .sort((a, b) => a.regionName.localeCompare(b.regionName, 'ko'));
  return _list;
}
