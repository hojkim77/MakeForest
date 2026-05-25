'use client';

import { useQuery } from '@tanstack/react-query';
import type { CommunityComment } from '@makeforest/types';
import { qk } from '@/shared/lib/queryKeys';
import { API_PATHS } from '@/shared/lib/apiPaths';

export function useCommentsQuery(postId: string, enabled: boolean) {
  return useQuery<CommunityComment[]>({
    queryKey: qk.community.comments(postId),
    queryFn: () =>
      fetch(API_PATHS.COMMUNITY_COMMENTS(postId)).then((r) => r.json() as Promise<CommunityComment[]>),
    enabled,
  });
}
