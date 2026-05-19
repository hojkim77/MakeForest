'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { CommunityPost, CommunityFeedResponse } from '@/shared/lib/communityTypes';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { api } from '@/shared/lib/api';
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
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [myReactions, setMyReactions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [selectedRegion, setSelectedRegion] = useState<{ key: string; name: string } | null>(null);

  const fetchMyReactions = useCallback(async (items: CommunityPost[]) => {
    if (!session?.user?.id || items.length === 0) return;
    const postIds = items.map((p) => p.id).join(',');
    try {
      const data = await api.get<Record<string, string[]>>(
        `${API_PATHS.COMMUNITY_MY_REACTIONS()}?postIds=${encodeURIComponent(postIds)}`,
      );
      setMyReactions((prev) => ({ ...prev, ...data }));
    } catch { }
  }, [session?.user?.id]);

  const fetchFeed = useCallback(async (params: { period: Period; sort: Sort; regionKey: string; cursor?: string }) => {
    const urlParams = new URLSearchParams({ limit: '20', period: params.period, sort: params.sort });
    if (params.cursor) urlParams.set('cursor', params.cursor);
    if (params.regionKey.trim()) urlParams.set('regionKey', params.regionKey.trim());
    return api.get<CommunityFeedResponse>(`${API_PATHS.COMMUNITY_FEED()}?${urlParams}`).catch(() => null);
  }, []);

  const resetFeed = useCallback(async (nextPeriod: Period, nextSort: Sort, regionKey: string) => {
    setLoading(true);
    const data = await fetchFeed({ period: nextPeriod, sort: nextSort, regionKey });
    if (data) {
      setPosts(data.items);
      setNextCursor(data.nextCursor);
      void fetchMyReactions(data.items);
    }
    setLoading(false);
  }, [fetchFeed, fetchMyReactions]);

  useEffect(() => {
    void resetFeed('all', 'recent', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchMyReactions(posts);

  }, [session?.user?.id]);

  const handlePeriodChange = useCallback((next: Period) => {
    setPeriod(next);
    void resetFeed(next, sort, selectedRegion?.key ?? '');
  }, [sort, selectedRegion, resetFeed]);

  const handleSortChange = useCallback((next: Sort) => {
    setSort(next);
    void resetFeed(period, next, selectedRegion?.key ?? '');
  }, [period, selectedRegion, resetFeed]);

  const handleRegionSelect = useCallback((regionKey: string, regionName: string) => {
    setSelectedRegion({ key: regionKey, name: regionName });
    void resetFeed(period, sort, regionKey);
  }, [period, sort, resetFeed]);

  const handleRegionReset = useCallback(() => {
    setSelectedRegion(null);
    void resetFeed(period, sort, '');
  }, [period, sort, resetFeed]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    const data = await fetchFeed({ period, sort, regionKey: selectedRegion?.key ?? '', cursor: nextCursor });
    if (data) {
      setPosts((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      void fetchMyReactions(data.items);
    }
    setLoading(false);
  }, [nextCursor, loading, period, sort, selectedRegion, fetchFeed, fetchMyReactions]);

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
        <PostCard key={post.id} post={post} isLoggedIn={isLoggedIn} myReactionEmojis={myReactions[post.id] ?? []} />
      ))}

      {sort === 'recent' && nextCursor && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loading}
          className="font-mono text-label text-on-surface-variant hover:text-on-surface disabled:opacity-50 py-sm"
        >
          {loading ? '불러오는 중...' : '더 보기'}
        </button>
      )}

      {loading && posts.length === 0 && (
        <p className="font-mono text-label text-outline">불러오는 중...</p>
      )}
    </section>
  );
}
