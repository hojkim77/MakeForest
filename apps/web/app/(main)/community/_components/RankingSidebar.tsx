'use client';

import { useState } from 'react';
import type { RegionRankingResponse, Period } from '@makeforest/types';
import { useRankingQuery } from '@/shared/hooks/queries/useRankingQuery';
import { RankingRow } from '@/app/(main)/_components/panel/RankingRow';
import { TabButton } from '@/app/(main)/_components/panel/TabButton';

const TABS: { key: Period; label: string }[] = [
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번 주' },
  { key: 'all', label: '전체' },
];

interface Props {
  initialRanking: RegionRankingResponse;
  fetchedAt: string;
}

export function RankingSidebar({ initialRanking, fetchedAt }: Props) {
  const [period, setPeriod] = useState<Period>(initialRanking.period);
  const { data, isFetching } = useRankingQuery(period, undefined, initialRanking);
  const rankings = data?.rankings ?? [];

  return (
    <aside className="flex flex-col gap-md sticky top-[var(--topbar-h)] h-[calc(100dvh-var(--topbar-h)-4rem)] overflow-y-auto">
      <h2 className="font-mono text-pixel-stat text-on-surface uppercase tracking-tighter">
        지역 랭킹 <span className="text-on-surface-variant normal-case">({fetchedAt} 기준)</span>
      </h2>

      {/* Tabs */}
      <div className="flex gap-xs">
        {TABS.map(({ key, label }) => (
          <TabButton
            key={key}
            label={label}
            active={period === key}
            onClick={() => setPeriod(key)}
            orientation="horizontal"
          />
        ))}
      </div>

      {/* Rankings */}
      <div className="flex flex-col gap-xs">
        {isFetching && rankings.length === 0 && (
          <p className="font-mono text-label text-on-surface-variant">불러오는 중...</p>
        )}
        {rankings.length === 0 && !isFetching && (
          <p className="font-mono text-label text-on-surface-variant">데이터가 없어요.</p>
        )}
        {rankings.map((r) => (
          <RankingRow
            key={r.regionKey}
            rank={r.rank}
            name={r.regionName}
            water={r.totalWater}
          />
        ))}
      </div>
    </aside>
  );
}
