'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

export function useMyReactionsQuery(postIds: string[], enabled: boolean) {
  return useQuery<Record<string, string[]>>({
    queryKey: qk.community.myReactions(postIds),
    queryFn: () => {
      const joined = postIds.join(',');
      return api.get<Record<string, string[]>>(
        `${API_PATHS.COMMUNITY_MY_REACTIONS()}?postIds=${encodeURIComponent(joined)}`,
      );
    },
    enabled: enabled && postIds.length > 0,
  });
}
