'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { toast } from '@/shared/lib/toast';

interface FriendAcceptVars {
  friendshipId: string;
  userId: string;
}

export function useFriendAcceptMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, FriendAcceptVars>({
    mutationFn: ({ friendshipId }) =>
      api.patch<{ ok: boolean }>(API_PATHS.FRIENDS_REQUEST(friendshipId), { action: 'accept' }),

    onSuccess: (_data, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: qk.friends.list(userId) });
      void queryClient.invalidateQueries({ queryKey: qk.friends.incoming(userId) });
      toast.info('친구 요청을 수락했습니다.');
    },

    onError: () => {
      toast.error('친구 요청 수락에 실패했습니다.');
    },
  });
}
