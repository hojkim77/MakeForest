'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateFriendRequestResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { toast } from '@/shared/lib/toast';

interface FriendRequestVars {
  targetUserId: string;
  userId: string;
}

export function useFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation<CreateFriendRequestResType, Error, FriendRequestVars>({
    mutationFn: ({ targetUserId }) =>
      api.post<CreateFriendRequestResType>(API_PATHS.FRIENDS_REQUESTS(), { targetUserId }),

    onSuccess: (data, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: qk.friends.list(userId) });
      void queryClient.invalidateQueries({ queryKey: qk.friends.incoming(userId) });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'search'] });
      if (data.status === 'ACCEPTED') {
        toast.info('친구 요청이 수락되었습니다.');
      }
    },

    onError: () => {
      toast.error('친구 요청에 실패했습니다.');
    },
  });
}
