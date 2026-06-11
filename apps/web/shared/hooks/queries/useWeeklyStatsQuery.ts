'use client';

import { useQuery } from '@tanstack/react-query';
import type { WeeklyStatsResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface Options {
  userId: string | null;
  initialData?: WeeklyStatsResType;
}

export function useWeeklyStatsQuery({ userId, initialData }: Options) {
  return useQuery<WeeklyStatsResType>({
    queryKey: userId ? qk.stats.weekly(userId) : (['stats', 'weekly', 'disabled'] as const),
    queryFn: () => api.get<WeeklyStatsResType>(API_PATHS.SERVER_STATS_WEEKLY(userId!)),
    enabled: !!userId,
    staleTime: Infinity,
    ...(userId && initialData !== undefined
      ? { initialData, initialDataUpdatedAt: Date.now() }
      : {}),
  });
}
