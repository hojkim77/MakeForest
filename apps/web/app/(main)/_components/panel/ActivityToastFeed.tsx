'use client';

import { useMapStore } from '@/shared/store';
import { useSseEvent } from '@/shared/hooks/useSseEvent';
import { toast } from '@/shared/lib/toast';
import { API_PATHS } from '@/shared/lib/apiPaths';

export function ActivityToastFeed({ myRegionCode }: { myRegionCode: string | null }) {
  const focusedRegionCode = useMapStore((s) => s.focusedRegionCode);
  const regionCode = focusedRegionCode ?? myRegionCode;
  const url = regionCode ? API_PATHS.SERVER_SSE_REGION(regionCode) : null;

  useSseEvent(url, 'water:toast', (raw) => {
    const { nickname } = JSON.parse(raw) as { nickname: string };
    toast.info(`💧 ${nickname}님이 물을 줬어요!`);
  });

  useSseEvent(url, 'session:toast', (raw) => {
    const { nickname } = JSON.parse(raw) as { nickname: string };
    toast.info(`🌿 ${nickname}님이 오늘의 미션에 참여했어요!`);
  });

  return null;
}
