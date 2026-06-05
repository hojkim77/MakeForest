'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { GuideAckResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface GuideTourCompleteVars {
  outcome: 'completed' | 'skipped';
}

export function useGuideTourCompleteMutation() {
  const queryClient = useQueryClient();

  return useMutation<GuideAckResType, Error, GuideTourCompleteVars>({
    mutationFn: ({ outcome }) =>
      api.post<GuideAckResType>(API_PATHS.GUIDE_TOUR_COMPLETE(), { outcome }),

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.guide.state() });
    },
  });
}
