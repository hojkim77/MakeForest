'use client';

import { useQuery } from '@tanstack/react-query';
import type { CollectionProgress } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { useKstDateStore } from '@/shared/store/kstDateStore';

interface Options {
  regionCode: string | null;
  initialData?: CollectionProgress | null;
}

export function useCollectionQuery({ regionCode, initialData }: Options) {
  const kstDate = useKstDateStore((s) => s.kstDate);

  const key = regionCode
    ? qk.collection.today(regionCode, kstDate)
    : (['collection', 'disabled'] as const);

  return useQuery({
    queryKey: key,
    queryFn: (): Promise<CollectionProgress | null> =>
      regionCode
        ? api.get<CollectionProgress>(API_PATHS.SERVER_COLLECTION_TODAY(regionCode))
        : Promise.resolve(null),
    enabled: !!regionCode,
    ...(regionCode && initialData !== undefined && initialData !== null
      ? { initialData, initialDataUpdatedAt: Date.now() }
      : {}),
  });
}
