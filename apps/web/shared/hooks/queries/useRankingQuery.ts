'use client';

import { useQuery } from '@tanstack/react-query';
import type { RegionRankingResponse } from '@makeforest/types';
import { qk } from '@/shared/lib/queryKeys';
import { API_PATHS } from '@/shared/lib/apiPaths';

export function useRankingQuery(
  period: string,
  myDongCode?: string,
  initialData?: RegionRankingResponse,
) {
  return useQuery({
    queryKey: qk.ranking.region(period, myDongCode),
    queryFn: (): Promise<RegionRankingResponse> =>
      fetch(API_PATHS.SERVER_RANKING_REGION(period, myDongCode)).then(
        (r) => r.json() as Promise<RegionRankingResponse>,
      ),
    ...(initialData !== undefined
      ? { initialData, initialDataUpdatedAt: Date.now() }
      : {}),
  });
}
