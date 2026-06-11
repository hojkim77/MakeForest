'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { CommunityFeedResponse } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface FeedFilters {
  period: string;
  sort: string;
  regionKey: string;
}

export function useCommunityFeedQuery(filters: FeedFilters, initialData?: CommunityFeedResponse) {
  return useInfiniteQuery<CommunityFeedResponse, Error, CommunityFeedResponse, ReturnType<typeof qk.community.feed>, string | null>({
    queryKey: qk.community.feed(filters),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20', period: filters.period, sort: filters.sort });
      if (pageParam) params.set('cursor', pageParam);
      if (filters.regionKey.trim()) params.set('regionKey', filters.regionKey.trim());
      return api.get<CommunityFeedResponse>(`${API_PATHS.COMMUNITY_FEED()}?${params}`);
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
    select: (data) => ({
      items: data.pages.flatMap((p) => p.items),
      nextCursor: data.pages[data.pages.length - 1]?.nextCursor ?? null,
    }),
    staleTime: 60_000,
    ...(initialData !== undefined
      ? {
          initialData: { pages: [initialData], pageParams: [null] },
          initialDataUpdatedAt: Date.now(),
        }
      : {}),
  });
}
