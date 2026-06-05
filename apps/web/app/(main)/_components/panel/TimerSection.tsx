'use client';

import { useMapStore } from '@/shared/store';
import { useTodaySessionQuery } from '@/shared/hooks/queries/useTodaySessionQuery';
import type { TodayStateResType } from '@makeforest/types';
import { TimerSettingSection } from './TimerSettingSection';
import { TimerWaterSection } from './TimerWaterSection';

interface Props {
  myRegionCode: string | null;
  userId: string | null;
  initialTodayState: TodayStateResType | null;
}

export function TimerSection({ myRegionCode, userId, initialTodayState }: Props) {
  const focusedRegionCode = useMapStore((s) => s.focusedRegionCode);
  const isPeeking = focusedRegionCode !== null && focusedRegionCode !== myRegionCode;

  const { data: todayState } = useTodaySessionQuery({
    userId,
    initialData: initialTodayState ?? undefined,
  });

  if (isPeeking) return null;

  const sessionStatus = todayState?.sessionStatus ?? 'NONE';

  if (sessionStatus === 'NONE' || sessionStatus === 'ABANDONED') {
    return (
      <TimerSettingSection
        myRegionCode={myRegionCode}
        userId={userId}
        initialTodayState={initialTodayState}
      />
    );
  }

  return (
    <TimerWaterSection
      userId={userId}
      initialTodayState={initialTodayState}
    />
  );
}
