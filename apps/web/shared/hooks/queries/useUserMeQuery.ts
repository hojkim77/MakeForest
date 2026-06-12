'use client';

import { useQuery } from '@tanstack/react-query';
import type { UserMeResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface Options {
  userId: string | null;
  initialData?: UserMeResType;
}

export function useUserMeQuery({ userId, initialData }: Options) {
  return useQuery<UserMeResType>({
    queryKey: userId ? qk.user.me(userId) : (['user', 'me', 'disabled'] as const),
    queryFn: () => api.get<UserMeResType>(API_PATHS.SERVER_USER_ME(userId!)),
    enabled: !!userId,
    staleTime: Infinity,
    ...(userId && initialData !== undefined
      ? { initialData, initialDataUpdatedAt: Date.now() }
      : {}),
  });
}
