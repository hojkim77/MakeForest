'use client';

import { useState } from 'react';
import type { RegionRankingResponse } from '@makeforest/types';
import { useRankingQuery } from '@/shared/hooks/queries/useRankingQuery';

type Period = 'today' | 'week' | 'all';

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
    <aside className="flex flex-col gap-md sticky top-[49px] h-[calc(100vh-49px-4rem)] overflow-y-auto">
      <h2 className="font-mono text-pixel-stat text-on-surface uppercase tracking-tighter">
        지역 랭킹 <span className="text-outline normal-case">({fetchedAt} 기준)</span>
      </h2>

      {/* Tabs */}
      <div className="flex gap-xs">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`px-sm py-xs font-mono text-label border transition-colors
              ${period === key
                ? 'border-primary bg-primary-container text-on-primary-container'
                : 'border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-variant'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Rankings */}
      <div className="flex flex-col gap-xs">
        {isFetching && rankings.length === 0 && (
          <p className="font-mono text-label text-outline">불러오는 중...</p>
        )}
        {rankings.length === 0 && !isFetching && (
          <p className="font-mono text-label text-outline">데이터가 없어요.</p>
        )}
        {rankings.map((r) => (
          <div key={r.regionKey} className="flex items-center gap-sm px-sm py-xs bg-surface-container border border-outline-variant">
            <span className={`font-mono text-label w-6 text-center ${r.rank <= 3 ? 'text-primary' : 'text-outline'}`}>
              {r.rank}
            </span>
            <span className="font-mono text-label text-on-surface flex-1 truncate">{r.regionName}</span>
            <span className="font-mono text-label text-on-surface-variant">💧 {r.totalWater}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
