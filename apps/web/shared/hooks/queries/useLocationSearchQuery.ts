'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';

interface DongResult {
  code: string;
  name: string;
  sigunguCode: string;
  sidoCode: string;
}

export function useLocationSearchQuery(debouncedQuery: string) {
  return useQuery<DongResult[]>({
    queryKey: ['location', 'search', debouncedQuery],
    queryFn: () => api.get<DongResult[]>(API_PATHS.LOCATION_SEARCH(debouncedQuery)),
    enabled: debouncedQuery.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
