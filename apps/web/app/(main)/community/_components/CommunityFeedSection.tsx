'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useCommunityFeedQuery } from '@/shared/hooks/queries/useCommunityFeedQuery';
import { useMyReactionsQuery } from '@/shared/hooks/queries/useMyReactionsQuery';
import { PostCard } from './PostCard';
import { RegionAccordion } from './RegionAccordion';

type Period = 'all' | 'today' | 'week';
type Sort = 'recent' | 'popular' | 'water';

const PERIOD_TABS: { key: Period; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번 주' },
];

const SORT_OPTIONS: { key: Sort; label: string }[] = [
  { key: 'recent', label: '최신순' },
  { key: 'popular', label: '인기순' },
  { key: 'water', label: '물주기 많은 순' },
];

const TAB_CLASS = (active: boolean) =>
  `px-sm py-xs font-mono text-label border transition-colors ${active
    ? 'border-primary bg-primary-container text-on-primary-container'
    : 'border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-variant'
  }`;

export function CommunityFeedSection() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user?.id;
  const [period, setPeriod] = useState<Period>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [selectedRegion, setSelectedRegion] = useState<{ key: string; name: string } | null>(null);

  const filters = { period, sort, regionKey: selectedRegion?.key ?? '' };

  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useCommunityFeedQuery(filters);

  const posts = data?.items ?? [];
  const postIds = posts.map((p) => p.id);

  const { data: myReactions = {} } = useMyReactionsQuery(postIds, isLoggedIn);

  const handlePeriodChange = useCallback((next: Period) => setPeriod(next), []);
  const handleSortChange = useCallback((next: Sort) => setSort(next), []);

  const handleRegionSelect = useCallback((regionKey: string, regionName: string) => {
    setSelectedRegion({ key: regionKey, name: regionName });
  }, []);

  const handleRegionReset = useCallback(() => setSelectedRegion(null), []);

  const loading = isPending;

  return (
    <section className="flex flex-col gap-md">
      <h2 className="font-mono text-pixel-stat text-on-surface uppercase tracking-tighter">오늘의 집중</h2>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-sm">
        {/* Period tabs */}
        <div className="flex gap-xs">
          {PERIOD_TABS.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => handlePeriodChange(key)} className={TAB_CLASS(period === key)}>
              {label}
            </button>
          ))}
        </div>

        {/* Sort buttons */}
        <div className="flex gap-xs">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => handleSortChange(key)} className={TAB_CLASS(sort === key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Region filter accordion */}
      <RegionAccordion
        selectedRegionKey={selectedRegion?.key ?? null}
        onSelect={handleRegionSelect}
        onReset={handleRegionReset}
      />

      {!loading && posts.length === 0 && (
        <p className="font-mono text-label text-outline">
          {selectedRegion ? '해당 지역의 집중 기록이 없어요.' : '집중 기록이 없어요.'}
        </p>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isLoggedIn={isLoggedIn}
          myReactionEmojis={myReactions[post.id] ?? []}
          feedFilters={filters}
        />
      ))}

      {sort === 'recent' && hasNextPage && (
        <button
          type="button"
          onClick={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
          className="font-mono text-label text-on-surface-variant hover:text-on-surface disabled:opacity-50 py-sm"
        >
          {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
        </button>
      )}

      {loading && posts.length === 0 && (
        <p className="font-mono text-label text-outline">불러오는 중...</p>
      )}
    </section>
  );
}
