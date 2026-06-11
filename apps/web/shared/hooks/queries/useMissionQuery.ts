'use client';

import { useQuery } from '@tanstack/react-query';
import type { MissionProgress } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { useKstDateStore } from '@/shared/store/kstDateStore';

interface Options {
  regionCode: string | null;
  initialData?: MissionProgress | null;
}

export function useMissionQuery({ regionCode, initialData }: Options) {
  const kstDate = useKstDateStore((s) => s.kstDate);

  const key = regionCode
    ? qk.mission.today(regionCode, kstDate)
    : (['mission', 'disabled'] as const);

  return useQuery({
    queryKey: key,
    queryFn: (): Promise<MissionProgress | null> =>
      regionCode
        ? api.get<MissionProgress>(API_PATHS.SERVER_MISSION_TODAY(regionCode))
        : Promise.resolve(null),
    enabled: !!regionCode,
    staleTime: Infinity,
    ...(regionCode && initialData !== undefined && initialData !== null
      ? { initialData, initialDataUpdatedAt: Date.now() }
      : {}),
  });
}
