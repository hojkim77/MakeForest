'use client';

import { useQuery } from '@tanstack/react-query';
import type { GuideStateResType } from '@makeforest/types';
import { qk } from '@/shared/lib/queryKeys';

export function useGuideStateQuery() {
  return useQuery<GuideStateResType | null>({
    queryKey: qk.guide.state(),
    queryFn: async () => {
      const res = await fetch('/api/guide/state', { cache: 'no-store' });
      if (!res.ok) return null;
      return res.json() as Promise<GuideStateResType>;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
