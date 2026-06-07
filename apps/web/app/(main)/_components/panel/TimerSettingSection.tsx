'use client';

import { useSession } from 'next-auth/react';
import { useSessionDraftStore } from '@/shared/store/sessionDraftStore';
import { useCreateSessionMutation } from '@/shared/hooks/mutations/useSessionMutation';
import { useTodaySessionQuery } from '@/shared/hooks/queries/useTodaySessionQuery';
import { useKstDateStore } from '@/shared/store/kstDateStore';
import { toast } from '@/shared/lib/toast';
import { handleApiError } from '@/shared/lib/handleApiError';
import type { CreateSessionResType, TodayStateResType } from '@makeforest/types';
import { SetupTimer } from './SetupTimer';

interface Props {
  myRegionCode: string | null;
  userId: string | null;
  initialTodayState: TodayStateResType | null;
}

export function TimerSettingSection({ userId, initialTodayState }: Props) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user?.id;
  const kstDate = useKstDateStore((s) => s.kstDate);

  const goal = useSessionDraftStore((s) => s.goal);
  const focusLengthMin = useSessionDraftStore((s) => s.focusLengthMin) ?? 30;
  const segmentCount = useSessionDraftStore((s) => s.segmentCount) ?? 12;
  const setFocusLengthMin = useSessionDraftStore((s) => s.setFocusLengthMin);
  const setSegmentCount = useSessionDraftStore((s) => s.setSegmentCount);

  const { mutateAsync: createSessionMutate, isPending: isStarting } = useCreateSessionMutation();

  const { data: todayState } = useTodaySessionQuery({
    userId,
    initialData: initialTodayState ?? undefined,
  });

  const sessionStatus = todayState?.sessionStatus ?? 'NONE';

  if (sessionStatus !== 'NONE' && sessionStatus !== 'ABANDONED') return null;

  async function handleStart(fLen: number, segs: number) {
    if (!isLoggedIn || !userId) return;
    try {
      const data = await createSessionMutate({
        userId,
        kstDate,
        todayGoal: goal.trim(),
        focusLengthMin: fLen,
        segmentCount: segs,
      });
      useSessionDraftStore.getState().reset();
      if ((data as CreateSessionResType).isNewSession) {
        toast.success('커뮤니티에 오늘의 집중이 공유됐어요!', { label: '보러 가기', href: '/community' });
      }
    } catch (err) {
      handleApiError(err, {
        fallback: '타이머 구동에 실패했어요. 잠시 후 다시 시도해주세요.',
        conflict: '세션을 시작할 수 없어요. 새로고침 후 다시 시도해주세요.',
      });
    }
  }

  return (
    <SetupTimer
      initialFocusLengthMin={focusLengthMin}
      initialSegmentCount={segmentCount}
      canStart={goal.trim().length > 0}
      isPending={isStarting}
      onStart={handleStart}
      onConfigChange={async (fLen, segs) => {
        setFocusLengthMin(fLen);
        setSegmentCount(segs);
      }}
    />
  );
}
