'use client';

import { useQuery } from '@tanstack/react-query';
import type { FriendListResType, IncomingRequestsResType, FriendSearchResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

export function useFriendsListQuery(userId: string | undefined) {
  return useQuery<FriendListResType>({
    queryKey: qk.friends.list(userId ?? ''),
    queryFn: () => api.get<FriendListResType>(API_PATHS.FRIENDS()),
    enabled: !!userId,
  });
}

export function useFriendsIncomingQuery(userId: string | undefined) {
  return useQuery<IncomingRequestsResType>({
    queryKey: qk.friends.incoming(userId ?? ''),
    queryFn: () => api.get<IncomingRequestsResType>(API_PATHS.FRIENDS_REQUESTS()),
    enabled: !!userId,
  });
}

export function useFriendSearchQuery(userId: string | undefined, nickname: string) {
  return useQuery<FriendSearchResType>({
    queryKey: qk.friends.search(nickname),
    queryFn: () => api.get<FriendSearchResType>(API_PATHS.FRIENDS_SEARCH(nickname)),
    enabled: !!userId && nickname.length > 0,
  });
}
