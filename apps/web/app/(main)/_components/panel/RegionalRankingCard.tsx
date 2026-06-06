'use client';

import type { RegionRankingResponse } from '@makeforest/types';
import { RankingRow } from './RankingRow';

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
          myRegionKey && <span className="font-mono text-label text-on-surface-variant">순위권 밖</span>
        )}
      </div>

      <div className="flex flex-col gap-xs">
        {rankings.slice(0, 10).map((r) => (
          <RankingRow
            key={r.regionKey}
            rank={r.rank}
            name={r.regionName}
            water={r.totalWater}
            isHighlighted={!!(myRegionKey && r.regionKey === myRegionKey)}
          />
        ))}
        {rankings.length === 0 && (
          <p className="font-mono text-label text-on-surface-variant">데이터가 없어요.</p>
        )}
      </div>
    </div>
  );
}
