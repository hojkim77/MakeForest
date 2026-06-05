'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { WaterResType, TodayStateResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface WaterMutationVars {
  userId: string;
  kstDate: string;
}

// Shape stored in the water.me query cache (matches Next.js /api/water/me response)
interface CachedWaterMe {
  waterCount: number;
  date: string;
  focusLengthMin: number;
  segmentCount: number;
  creatureStage: number;
  creatureWaterCount: number;
  creatureFocusMinutes: number;
}

export function useWaterMutation() {
  const queryClient = useQueryClient();

  return useMutation<WaterResType, Error, WaterMutationVars, { previousWater: unknown; previousTodayState: unknown }>({
    mutationFn: () => api.post<WaterResType>(API_PATHS.WATER()),

    onMutate: async ({ userId, kstDate }) => {
      const waterKey = qk.water.me(userId, kstDate);
      const todayStateKey = qk.sessions.todayState(userId, kstDate);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: waterKey }),
        queryClient.cancelQueries({ queryKey: todayStateKey }),
      ]);
      const previousWater = queryClient.getQueryData(waterKey);
      const previousTodayState = queryClient.getQueryData(todayStateKey);

      queryClient.setQueryData<CachedWaterMe>(waterKey, (prev) => {
        if (!prev) return prev;
        return { ...prev, waterCount: prev.waterCount + 1 };
      });
      queryClient.setQueryData<TodayStateResType>(todayStateKey, (old) =>
        old ? { ...old, sessionStatus: 'IDLE', startedAt: null, waterCount: (old.waterCount ?? 0) + 1 } : old,
      );

      return { previousWater, previousTodayState };
    },

    onError: (_err, { userId, kstDate }, context) => {
      if (context?.previousWater) {
        queryClient.setQueryData(qk.water.me(userId, kstDate), context.previousWater);
      }
      if (context?.previousTodayState !== undefined) {
        queryClient.setQueryData(qk.sessions.todayState(userId, kstDate), context.previousTodayState);
      }
    },

    onSettled: (_data, _err, { userId, kstDate }) => {
      void queryClient.invalidateQueries({ queryKey: qk.water.me(userId, kstDate) });
      void queryClient.invalidateQueries({ queryKey: qk.points.me(userId) });
      void queryClient.invalidateQueries({ queryKey: qk.sessions.todayState(userId, kstDate) });
    },
  });
}
