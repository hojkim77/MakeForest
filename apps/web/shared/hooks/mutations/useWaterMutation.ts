'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { WaterResType, WaterMeResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface WaterMutationVars {
  userId: string;
  kstDate: string;
}

export function useWaterMutation() {
  const queryClient = useQueryClient();

  return useMutation<WaterResType, Error, WaterMutationVars, { previousWater: unknown }>({
    mutationFn: () => api.post<WaterResType>(API_PATHS.WATER()),

    onMutate: async ({ userId, kstDate }) => {
      const key = qk.water.me(userId, kstDate);
      await queryClient.cancelQueries({ queryKey: key });
      const previousWater = queryClient.getQueryData(key);

      queryClient.setQueryData<WaterMeResType>(key, (prev) => {
        if (!prev) return prev;
        return { ...prev, waterCount: prev.waterCount + 1 };
      });

      return { previousWater };
    },

    onError: (_err, { userId, kstDate }, context) => {
      if (context?.previousWater) {
        queryClient.setQueryData(qk.water.me(userId, kstDate), context.previousWater);
      }
    },

    onSettled: (_data, _err, { userId, kstDate }) => {
      void queryClient.invalidateQueries({ queryKey: qk.water.me(userId, kstDate) });
      void queryClient.invalidateQueries({ queryKey: qk.points.me(userId) });
    },
  });
}
