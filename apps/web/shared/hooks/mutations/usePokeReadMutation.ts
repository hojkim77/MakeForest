'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PokeReadResType, PokeInboxResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

export function usePokeReadMutation(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<PokeReadResType, Error>({
    mutationFn: () => api.post<PokeReadResType>(API_PATHS.POKES_INBOX_READ()),

    onSuccess: () => {
      if (!userId) return;
      queryClient.setQueryData<PokeInboxResType>(qk.pokes.inbox(userId), (old) => {
        if (!old) return old;
        return {
          ...old,
          unreadCount: 0,
          items: old.items.map((item) => ({ ...item, isRead: true })),
        };
      });
    },
  });
}
