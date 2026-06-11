'use client';

import { useQuery } from '@tanstack/react-query';
import type { TodayStateResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { useKstDateStore } from '@/shared/store/kstDateStore';

interface Options {
  userId: string | null;
  initialData?: TodayStateResType | undefined;
}

export function useTodaySessionQuery({ userId, initialData }: Options) {
  const kstDate = useKstDateStore((s) => s.kstDate);

  return useQuery<TodayStateResType>({
    queryKey: userId ? qk.sessions.todayState(userId, kstDate) : (['sessions', 'todayState', 'disabled'] as const),
    queryFn: () => api.get<TodayStateResType>(API_PATHS.SERVER_SESSION_TODAY(userId!)),
    enabled: !!userId,
    staleTime: Infinity,
    ...(userId && initialData !== undefined
      ? { initialData, initialDataUpdatedAt: Date.now() }
      : {}),
  });
}
