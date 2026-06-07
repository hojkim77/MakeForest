'use client';

import { useEffect, useRef, useReducer } from 'react';
import { useSession } from 'next-auth/react';
import { Icon } from '@/shared/components/ui/Icon';
import { Button } from '@/shared/components/ui/Button';
import { formatDuration } from '@/shared/utils/format';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { toast } from '@/shared/lib/toast';
import { handleApiError } from '@/shared/lib/handleApiError';
import { useWaterMutation } from '@/shared/hooks/mutations/useWaterMutation';
import { useCreateSessionMutation } from '@/shared/hooks/mutations/useSessionMutation';
import { useTodaySessionQuery } from '@/shared/hooks/queries/useTodaySessionQuery';
import { useKstDateStore } from '@/shared/store/kstDateStore';
import { useMidnightReset } from '@/shared/hooks/useMidnightReset';
import type { CreateSessionResType, TodayStateResType } from '@makeforest/types';

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface Props {
  userId: string | null;
  initialTodayState: TodayStateResType | null;
}

export function TimerWaterSection({ userId, initialTodayState }: Props) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user?.id;
  const kstDate = useKstDateStore((s) => s.kstDate);

  useMidnightReset();

  const { data: todayState } = useTodaySessionQuery({
    userId,
    initialData: initialTodayState ?? undefined,
  });
  const { mutateAsync: waterMutate, isPending: isWatering } = useWaterMutation();
  const { mutateAsync: createSessionMutate } = useCreateSessionMutation();

  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const completeCalledRef = useRef(false);

  const sessionStatus = todayState?.sessionStatus ?? 'NONE';
  const focusLengthMin = todayState?.focusLengthMin ?? 30;
  const segmentCount = todayState?.segmentCount ?? 12;
  const sessionId = todayState?.sessionId ?? null;
  const startedAt = todayState?.startedAt ?? null;
  const waterCount = todayState?.waterCount ?? 0;

  const cycleSec = focusLengthMin * 60;
  const elapsedSec = startedAt
    ? Math.min(Math.floor((Date.now() - Date.parse(startedAt)) / 1000), cycleSec)
    : 0;
  const isComplete = elapsedSec >= cycleSec && (sessionStatus === 'RUNNING' || sessionStatus === 'COMPLETED');

  // 1-second tick when running
  useEffect(() => {
    if (sessionStatus !== 'RUNNING') return;
    const id = setInterval(forceUpdate, 1000);
    return () => clearInterval(id);
  }, [sessionStatus]);

  // Cycle complete → PATCH session + push notify (once per cycle)
  useEffect(() => {
    if (!isComplete || sessionStatus === 'COMPLETED' || !sessionId || !isLoggedIn) {
      if (!isComplete) completeCalledRef.current = false;
      return;
    }
    if (completeCalledRef.current) return;
    completeCalledRef.current = true;
    api.patch(API_PATHS.SESSION(sessionId), { action: 'complete' }).catch(() => {});
    api.post(API_PATHS.PUSH_NOTIFY()).catch(() => {});
  }, [isComplete, sessionStatus, sessionId, isLoggedIn]);

  // Tab 복귀 시 경과 시간 재계산
  useEffect(() => {
    if (sessionStatus !== 'RUNNING' || !startedAt) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      forceUpdate();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [sessionStatus, startedAt]);

  if (sessionStatus === 'NONE') return null;

  const DAILY_MAX_SEC = segmentCount * cycleSec;
  const totalSec = Math.min(waterCount * cycleSec + elapsedSec, DAILY_MAX_SEC);

  const capH = Math.floor((segmentCount * focusLengthMin) / 60);
  const capM = (segmentCount * focusLengthMin) % 60;
  const capLabel = capH > 0 ? (capM > 0 ? `${capH}h ${capM}m` : `${capH}h`) : `${capM}m`;

  async function handleStart() {
    if (!isLoggedIn || !userId) return;
    const todayGoal = todayState?.todayGoal ?? '';
    try {
      const data = await createSessionMutate({
        userId,
        kstDate,
        todayGoal,
        focusLengthMin,
        segmentCount,
      });
      if ((data as CreateSessionResType).isNewSession) {
        toast.success('커뮤니티에 오늘의 집중이 공유됐어요!', { label: '보러 가기', href: '/community' });
      }
    } catch (err) {
      handleApiError(err, { fallback: '타이머 구동에 실패했어요. 잠시 후 다시 시도해주세요.' });
    }
  }

  async function handleWater() {
    if (isWatering || !userId) return;
    try {
      await waterMutate({ userId, kstDate });
      if (waterCount + 1 >= segmentCount) {
        toast.success('오늘 집중 고생하셨어요! 🌱');
      }
    } catch (err) {
      handleApiError(err, { conflict: '오늘 물주기를 이미 완료했어요.', fallback: '물주기에 실패했어요. 잠시 후 다시 시도해주세요.' });
    }
  }

  const isDailyDone = waterCount >= segmentCount;

  const buttonLabel = (() => {
    if (isDailyDone) return '오늘의 집중 완료';
    if (isComplete) return isWatering ? '물주는중' : '물주기';
    if (sessionStatus === 'RUNNING') return '집중중';
    return '재개';
  })();

  const buttonDisabled = isDailyDone || (sessionStatus === 'RUNNING' && !isComplete) || (isComplete && isWatering);

  return (
    <div data-guide="timer.start" className="flex flex-col gap-sm border-t border-outline pt-md">
      {/* dynamic segment gauge */}
      <div className="flex gap-px w-full h-3">
        {Array.from({ length: segmentCount }, (_, i) => {
          const isFilled = i < waterCount;
          const isCurrent = i === waterCount;
          const fillPct = isCurrent ? Math.min((elapsedSec / cycleSec) * 100, 100) : 0;

          return (
            <div key={i} className="flex-1 relative bg-surface-variant overflow-hidden">
              {(isFilled || (isCurrent && fillPct > 0)) && (
                <div
                  className="absolute inset-y-0 left-0 animate-water-flow"
                  style={{ width: isFilled ? '100%' : `${fillPct}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 타이머 + 오늘 집중 시간 */}
      <div className="flex items-end justify-between">
        <span
          className="font-mono tabular-nums text-3xl leading-none text-on-surface"
          data-testid="timer-display"
        >
          {formatTimer(elapsedSec)}
        </span>
        <span className="font-mono text-label text-on-surface-variant uppercase tracking-wider">
          오늘 집중&nbsp;
          <span className="text-primary">{formatDuration(totalSec)} / {capLabel}</span>
        </span>
      </div>

      {/* 단일 버튼 */}
      <Button
        onClick={!isDailyDone && isComplete ? handleWater : handleStart}
        disabled={buttonDisabled}
        data-testid="timer-btn"
        data-guide="water.action"
        className="w-full uppercase"
      >
        {sessionStatus === 'RUNNING' && !isComplete && !isDailyDone ? (
          <span className="flex items-center gap-[1px]">
            집중중
            <span className="dot-1">.</span>
            <span className="dot-2">.</span>
            <span className="dot-3">.</span>
          </span>
        ) : (
          <>
            <Icon
              name={isComplete && !isDailyDone ? 'water_drop' : 'play_arrow'}
              filled
              size={18}
            />
            {buttonLabel}
          </>
        )}
      </Button>
    </div>
  );
}
