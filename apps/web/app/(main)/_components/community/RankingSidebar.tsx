'use client';

import { useState } from 'react';
import type { DongRanking, RankingResponse } from '@/shared/lib/communityTypes';

type Period = 'today' | 'week' | 'all';

const TABS: { key: Period; label: string }[] = [
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번 주' },
  { key: 'all', label: '전체' },
];

const SERVER_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000')
    : 'http://localhost:4000';

interface Props {
  initialRanking: RankingResponse;
}

export function RankingSidebar({ initialRanking }: Props) {
  const [period, setPeriod] = useState<Period>(initialRanking.period);
  const [rankings, setRankings] = useState<DongRanking[]>(initialRanking.rankings);
  const [loading, setLoading] = useState(false);

  async function switchPeriod(next: Period) {
    if (next === period || loading) return;
    setLoading(true);
    const res = await fetch(`${SERVER_URL}/ranking/dong?period=${next}`);
    if (res.ok) {
      const data = await res.json() as RankingResponse;
      setRankings(data.rankings);
    }
    setPeriod(next);
    setLoading(false);
  }

  return (
    <aside className="flex flex-col gap-md sticky top-[49px] h-[calc(100vh-49px-4rem)] overflow-y-auto">
      <h2 className="font-mono text-pixel-stat text-on-surface uppercase tracking-tighter">동네 랭킹</h2>

      {/* Tabs */}
      <div className="flex gap-xs">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => void switchPeriod(key)}
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
        {rankings.length === 0 && (
          <p className="font-mono text-label text-outline">데이터가 없어요.</p>
        )}
        {rankings.map((r) => (
          <div key={r.dongCode} className="flex items-center gap-sm px-sm py-xs bg-surface-container border border-outline-variant">
            <span className={`font-mono text-label w-6 text-center ${r.rank <= 3 ? 'text-primary' : 'text-outline'}`}>
              {r.rank}
            </span>
            <span className="font-mono text-label text-on-surface flex-1 truncate">{r.dongName}</span>
            <span className="font-mono text-label text-on-surface-variant">💧 {r.totalWater}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
