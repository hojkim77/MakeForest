'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useCommunityFeedQuery } from '@/shared/hooks/queries/useCommunityFeedQuery';
import { useMyReactionsQuery } from '@/shared/hooks/queries/useMyReactionsQuery';
import type { CommunityFeedResponse, Period } from '@makeforest/types';
import { TabButton } from '@/app/(main)/_components/panel/TabButton';
import { PostCard } from './PostCard';
import { RegionAccordion } from './RegionAccordion';
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

const DEFAULT_PERIOD: Period = 'all';
const DEFAULT_SORT: Sort = 'recent';

interface Props {
  initialFeed: CommunityFeedResponse;
}

export function CommunityFeedSection({ initialFeed }: Props) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user?.id;
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [selectedRegion, setSelectedRegion] = useState<{ key: string; name: string } | null>(null);
  const [filterChanged, setFilterChanged] = useState(false);
  const isInitialFilter = period === DEFAULT_PERIOD && sort === DEFAULT_SORT && !selectedRegion;

  const filters = { period, sort, regionKey: selectedRegion?.key ?? '' };

  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useCommunityFeedQuery(filters, isInitialFilter ? initialFeed : undefined);

  const posts = data?.items ?? [];
  const postIds = posts.map((p) => p.id);

  const { data: myReactions = {} } = useMyReactionsQuery(postIds, isLoggedIn);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage && sort === 'recent') {
          void fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, sort]);

  const handlePeriodChange = useCallback((next: Period) => {
    setPeriod(next);
    setFilterChanged(true);
  }, []);
  const handleSortChange = useCallback((next: Sort) => {
    setSort(next);
    setFilterChanged(true);
  }, []);

  const handleRegionSelect = useCallback((regionKey: string, regionName: string) => {
    setSelectedRegion({ key: regionKey, name: regionName });
    setFilterChanged(true);
  }, []);

  const handleRegionReset = useCallback(() => {
    setSelectedRegion(null);
    setFilterChanged(true);
  }, []);

  const showSkeleton = filterChanged && isPending;

  return (
    <section className="flex flex-col gap-md">
      <h2 className="font-mono text-pixel-stat text-on-surface uppercase tracking-tighter">오늘의 집중</h2>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-sm">
        {/* Period tabs */}
        <div className="flex gap-xs">
          {PERIOD_TABS.map(({ key, label }) => (
            <TabButton key={key} label={label} active={period === key} onClick={() => handlePeriodChange(key)} orientation="horizontal" />
          ))}
        </div>

        {/* Sort buttons */}
        <div className="flex gap-xs">
          {SORT_OPTIONS.map(({ key, label }) => (
            <TabButton key={key} label={label} active={sort === key} onClick={() => handleSortChange(key)} orientation="horizontal" />
          ))}
        </div>
      </div>

      {/* Region filter accordion */}
      <RegionAccordion
        selectedRegionKey={selectedRegion?.key ?? null}
        onSelect={handleRegionSelect}
        onReset={handleRegionReset}
      />

      {showSkeleton && (
        <div className="flex flex-col gap-md">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 bg-surface-container border-2 border-outline animate-pulse" />
          ))}
        </div>
      )}

      {!showSkeleton && !isPending && posts.length === 0 && (
        <p className="font-mono text-label text-on-surface-variant">
          {selectedRegion ? '해당 지역의 집중 기록이 없어요.' : '집중 기록이 없어요.'}
        </p>
      )}

      {!showSkeleton && posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isLoggedIn={isLoggedIn}
          myReactionEmojis={myReactions[post.id] ?? []}
          feedFilters={filters}
        />
      ))}

      {sort === 'recent' && (
        <div ref={sentinelRef} className="h-px" aria-hidden />
      )}

      {isFetchingNextPage && (
        <div className="h-24 bg-surface-container border-2 border-outline animate-pulse" />
      )}
    </section>
  );
}
