'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PokeResType, PointsMeResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { toast } from '@/shared/lib/toast';

interface PokeMutationVars {
  toUserId: string;
  userId: string;
}

export function usePokeMutation() {
  const queryClient = useQueryClient();

  return useMutation<PokeResType, Error, PokeMutationVars, { previousPoints: PointsMeResType | undefined }>({
    mutationFn: ({ toUserId }) => api.post<PokeResType>(API_PATHS.POKES(), { toUserId }),

    onMutate: async ({ userId }) => {
      const key = qk.points.me(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previousPoints = queryClient.getQueryData<PointsMeResType>(key);

      queryClient.setQueryData<PointsMeResType>(key, (prev) => {
        if (!prev) return prev;
        return { ...prev, balance: Math.max(0, prev.balance - 2) };
      });

      return { previousPoints };
    },

    onError: (err, { userId }, context) => {
      if (context?.previousPoints !== undefined) {
        queryClient.setQueryData(qk.points.me(userId), context.previousPoints);
      }
      toast.error('찌르기에 실패했습니다.');
    },

    onSettled: (_data, _err, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: qk.points.me(userId) });
      void queryClient.invalidateQueries({ queryKey: qk.friends.list(userId) });
    },
  });
}
