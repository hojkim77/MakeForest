'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { toast } from '@/shared/lib/toast';

interface FriendDeleteVars {
  targetUserId: string;
  userId: string;
}

export function useFriendDeleteMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, FriendDeleteVars>({
    mutationFn: ({ targetUserId }) => api.delete<{ ok: boolean }>(API_PATHS.FRIEND(targetUserId)),

    onSuccess: (_data, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: qk.friends.list(userId) });
    },

    onError: () => {
      toast.error('친구 삭제에 실패했습니다.');
    },
  });
}
