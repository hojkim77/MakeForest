'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { toast } from '@/shared/lib/toast';

interface FriendRejectVars {
  friendshipId: string;
  userId: string;
}

export function useFriendRejectMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, FriendRejectVars>({
    mutationFn: ({ friendshipId }) =>
      api.patch<{ ok: boolean }>(API_PATHS.FRIENDS_REQUEST(friendshipId), { action: 'reject' }),

    onSuccess: (_data, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: qk.friends.incoming(userId) });
    },

    onError: () => {
      toast.error('친구 요청 거절에 실패했습니다.');
    },
  });
}
