'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from '@/shared/lib/queryKeys';
import { API_PATHS } from '@/shared/lib/apiPaths';

interface RegionItem {
  regionKey: string;
  regionName: string;
}

export function useLocationRegionsQuery() {
  return useQuery<RegionItem[]>({
    queryKey: qk.location.regions(),
    queryFn: () =>
      fetch(API_PATHS.LOCATION_REGIONS()).then((r) => r.json() as Promise<RegionItem[]>),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
