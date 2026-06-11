'use client';

import { useQuery } from '@tanstack/react-query';
import type { RankStatsResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface Options {
  userId: string | null;
  dongCode?: string | undefined;
  initialData?: RankStatsResType;
}

export function useRankStatsQuery({ userId, dongCode, initialData }: Options) {
  return useQuery<RankStatsResType>({
    queryKey: userId ? qk.stats.rank(userId, dongCode) : (['stats', 'rank', 'disabled'] as const),
    queryFn: () => {
      const params = new URLSearchParams({ userId: userId! });
      if (dongCode) params.set('dongCode', dongCode);
      return api.get<RankStatsResType>(API_PATHS.SERVER_STATS_RANK(params.toString()));
    },
    enabled: !!userId,
    staleTime: Infinity,
    ...(userId && initialData !== undefined
      ? { initialData, initialDataUpdatedAt: Date.now() }
      : {}),
  });
}
