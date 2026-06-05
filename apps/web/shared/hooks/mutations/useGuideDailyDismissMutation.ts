'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { GuideAckResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface GuideDailyDismissVars {
  outcome: 'completed' | 'skipped';
}

export function useGuideDailyDismissMutation() {
  const queryClient = useQueryClient();

  return useMutation<GuideAckResType, Error, GuideDailyDismissVars>({
    mutationFn: ({ outcome }) =>
      api.post<GuideAckResType>(API_PATHS.GUIDE_DAILY_DISMISS(), { outcome }),

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.guide.state() });
    },
  });
}
