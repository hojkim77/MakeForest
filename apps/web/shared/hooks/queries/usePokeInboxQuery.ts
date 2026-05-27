'use client';

import { useQuery } from '@tanstack/react-query';
import type { PokeInboxResType } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

export function usePokeInboxQuery(userId: string | undefined) {
  return useQuery<PokeInboxResType>({
    queryKey: qk.pokes.inbox(userId ?? ''),
    queryFn: () => api.get<PokeInboxResType>(API_PATHS.POKES_INBOX()),
    enabled: !!userId,
  });
}
