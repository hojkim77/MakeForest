import { prisma } from '@makeforest/db';

interface DongInfo {
  name: string;
  sigunguCode: string;
  lat: number;
  lng: number;
}

let _cache: Map<string, DongInfo> | null = null;

async function getCache(): Promise<Map<string, DongInfo>> {
  if (_cache) return _cache;
  const rows = await prisma.dong.findMany({
    select: { code: true, name: true, sigunguCode: true, lat: true, lng: true },
  });
  _cache = new Map(rows.map((d) => [d.code, { name: d.name, sigunguCode: d.sigunguCode, lat: d.lat, lng: d.lng }]));
  return _cache;
}

// "경기도 부천시원미구 오정동" → "부천시" / "서울특별시 강북구 우이동" → "강북구"
export function extractCityCounty(fullName: string): string {
  const sigungu = fullName.split(' ')[1] ?? fullName;
  const siIdx = sigungu.indexOf('시');
  if (siIdx > 0 && siIdx < sigungu.length - 1) return sigungu.slice(0, siIdx + 1);
  return sigungu;
}

export async function getDongShortName(code: string): Promise<string | null> {
  const c = await getCache();
  const d = c.get(code);
  return d ? (d.name.split(' ').at(-1) ?? null) : null;
}

export async function getDongFullName(code: string): Promise<string | null> {
  return (await getCache()).get(code)?.name ?? null;
}

export async function getDongCoords(code: string): Promise<{ lat: number; lng: number } | null> {
  const d = (await getCache()).get(code);
  return d ? { lat: d.lat, lng: d.lng } : null;
}

export async function getDongSigunguMap(
  codes: string[],
): Promise<Map<string, { regionKey: string; regionName: string }>> {
  const c = await getCache();
  const result = new Map<string, { regionKey: string; regionName: string }>();
  for (const code of codes) {
    const d = c.get(code);
    if (d) {
      const regionName = extractCityCounty(d.name);
      const regionKey = `${d.sigunguCode.slice(0, 2)}:${regionName}`;
      result.set(code, { regionKey, regionName });
    }
  }
  return result;
}

export async function getDongRegionKey(code: string): Promise<string | null> {
  const d = (await getCache()).get(code);
  if (!d) return null;
  const regionName = extractCityCounty(d.name);
  return `${d.sigunguCode.slice(0, 2)}:${regionName}`;
}

export async function searchDongCodesByName(query: string): Promise<string[]> {
  const lower = query.toLowerCase();
  const c = await getCache();
  const codes: string[] = [];
  for (const [code, d] of c) {
    if (d.name.toLowerCase().includes(lower)) codes.push(code);
  }
  return codes;
}

export async function getAllDongs(): Promise<Array<{ code: string; name: string; lat: number; lng: number }>> {
  const c = await getCache();
  return [...c.entries()].map(([code, d]) => ({ code, name: d.name, lat: d.lat, lng: d.lng }));
}
