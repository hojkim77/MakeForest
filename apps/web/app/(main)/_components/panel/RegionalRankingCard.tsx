'use client';

import type { RegionRankingResponse } from '@makeforest/types';

interface Props {
  myRegionKey: string | null | undefined;
  initialRanking: RegionRankingResponse;
}

export function RegionalRankingCard({ myRegionKey, initialRanking }: Props) {
  const { rankings } = initialRanking;

  const myEntry = myRegionKey ? rankings.find((r) => r.regionKey === myRegionKey) : null;

  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-label text-on-surface uppercase tracking-tighter">오늘의 지역 랭킹</h3>
        {myEntry ? (
          <span className="font-mono text-label text-primary">{myEntry.regionName} {myEntry.rank}위</span>
        ) : (
          myRegionKey && <span className="font-mono text-label text-outline">순위권 밖</span>
        )}
      </div>

      <div className="flex flex-col gap-xs">
        {rankings.slice(0, 10).map((r) => {
          const isMyRegion = myRegionKey && r.regionKey === myRegionKey;
          return (
            <div
              key={r.regionKey}
              className={`flex items-center gap-sm px-sm py-xs border font-mono text-label ${
                isMyRegion
                  ? 'bg-primary-container border-primary'
                  : 'bg-surface-container border-outline-variant'
              }`}
            >
              <span className={`w-5 text-center shrink-0 ${r.rank <= 3 ? 'text-primary' : 'text-outline'}`}>
                {r.rank}
              </span>
              <span className="flex-1 truncate text-on-surface">{r.regionName}</span>
              <span className="text-on-surface-variant shrink-0">💧 {r.totalWater}</span>
            </div>
          );
        })}
        {rankings.length === 0 && (
          <p className="font-mono text-label text-outline">데이터가 없어요.</p>
        )}
      </div>
    </div>
  );
}
