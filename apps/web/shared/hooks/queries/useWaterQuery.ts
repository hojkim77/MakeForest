'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { useKstDateStore } from '@/shared/store/kstDateStore';
import { calcGrowthPercent } from '@/shared/utils/creature';

// Shape returned by the Next.js /api/water/me route
interface WaterMeApiResponse {
  waterCount: number;
  date: string;
  focusLengthMin: number;
  segmentCount: number;
  creatureStage: number;
  creatureWaterCount: number;
  creatureFocusMinutes: number;
}

export interface WaterQueryData {
  waterCount: number;
  creatureStage: number;
  totalWaterCount: number;
  growthPercent: number;
}

interface Options {
  userId: string | null;
  initialData?: WaterQueryData;
}

export function useWaterQuery({ userId, initialData }: Options) {
  const kstDate = useKstDateStore((s) => s.kstDate);

  const initialDataResolved: WaterMeApiResponse | undefined = initialData
    ? {
        waterCount: initialData.waterCount,
        date: kstDate,
        focusLengthMin: 30,
        segmentCount: 12,
        creatureStage: initialData.creatureStage,
        creatureWaterCount: initialData.totalWaterCount,
        creatureFocusMinutes: 0,
      }
    : undefined;

  const query = useQuery({
    queryKey: userId ? qk.water.me(userId, kstDate) : (['water', 'disabled'] as const),
    queryFn: (): Promise<WaterMeApiResponse> => api.get<WaterMeApiResponse>(API_PATHS.WATER_ME()),
    enabled: !!userId,
    ...(initialDataResolved !== undefined
      ? { initialData: initialDataResolved, initialDataUpdatedAt: Date.now() }
      : {}),
  });

  const raw = query.data as WaterMeApiResponse | undefined;

  const waterCount = raw?.waterCount ?? 0;
  const creatureStage = Math.min(raw?.creatureStage ?? 0, 9);
  const totalWaterCount = raw?.creatureWaterCount ?? 0;
  const growthPercent = calcGrowthPercent(totalWaterCount, creatureStage);

  return {
    ...query,
    waterCount,
    creatureStage,
    totalWaterCount,
    growthPercent,
  };
}
