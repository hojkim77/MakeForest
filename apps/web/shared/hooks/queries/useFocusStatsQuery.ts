'use client';

import { useQuery } from '@tanstack/react-query';
import type { FocusStatsResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface Options {
  userId: string | null;
  initialData?: FocusStatsResType;
}

export function useFocusStatsQuery({ userId, initialData }: Options) {
  return useQuery<FocusStatsResType>({
    queryKey: userId ? qk.stats.focus(userId) : (['stats', 'focus', 'disabled'] as const),
    queryFn: () => api.get<FocusStatsResType>(API_PATHS.SERVER_STATS_FOCUS(userId!)),
    enabled: !!userId,
    staleTime: Infinity,
    ...(userId && initialData !== undefined
      ? { initialData, initialDataUpdatedAt: Date.now() }
      : {}),
  });
}
