'use client';

import { useQuery } from '@tanstack/react-query';
import type { PointsMeResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

export function usePointsQuery(userId: string | undefined) {
  return useQuery<PointsMeResType>({
    queryKey: qk.points.me(userId ?? ''),
    queryFn: () => api.get<PointsMeResType>(API_PATHS.POINTS_ME()),
    enabled: !!userId,
  });
}
