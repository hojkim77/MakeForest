'use client';

import { useQuery } from '@tanstack/react-query';
import type { MapUser } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

export type ActivityMap = Record<string, number>;

export interface MapSnapshot {
  heatmap: ActivityMap;
  users: MapUser[];
}

export const EMPTY_SNAPSHOT: MapSnapshot = { heatmap: {}, users: [] };

export function useMapSnapshotQuery() {
  return useQuery<MapSnapshot>({
    queryKey: qk.map.snapshot(),
    queryFn: () => api.get<MapSnapshot>(API_PATHS.SERVER_MAP_SNAPSHOT()),
    staleTime: Infinity,
    placeholderData: EMPTY_SNAPSHOT,
  });
}
