export function aggregateRegionRankings(
  grouped: { dongCode: string; waterCount: number }[],
  sigunguMap: Map<string, { regionKey: string; regionName: string }>,
  limit = 20,
): { rank: number; regionKey: string; regionName: string; totalWater: number }[] {
  const regionMap = new Map<string, { totalWater: number; regionName: string }>();

  for (const { dongCode, waterCount } of grouped) {
    const info = sigunguMap.get(dongCode);
    if (!info) continue;
    const existing = regionMap.get(info.regionKey);
    if (existing) {
      existing.totalWater += waterCount;
    } else {
      regionMap.set(info.regionKey, { totalWater: waterCount, regionName: info.regionName });
    }
  }

  return [...regionMap.entries()]
    .sort((a, b) => b[1].totalWater - a[1].totalWater)
    .slice(0, limit)
    .map(([regionKey, { regionName, totalWater }], i) => ({
      rank: i + 1,
      regionKey,
      regionName,
      totalWater,
    }));
}
