'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMapStore, useTimerStore, useWaterStore } from '@/shared/store';
import { CYCLE_MS, CYCLE_SEC } from '@/shared/store/timerStore';
import { Icon } from '@/shared/components/ui/Icon';

const TOTAL_SEGMENTS = 12;
const DAILY_MAX_SEC = TOTAL_SEGMENTS * CYCLE_SEC;

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TimerWaterSection({ myRegionCode }: { myRegionCode: string | null }) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user?.id;

  const focusedRegionCode = useMapStore((s) => s.focusedRegionCode);
  const isPeeking = focusedRegionCode !== null && focusedRegionCode !== myRegionCode;

  const { sessionId, startedAt, status: timerStatus, cycleCount, todos, startSession, complete, reset } = useTimerStore();
  const { waterCount, isWatering, setIsWatering, applyWaterResponse } = useWaterStore();
  const [showDoneToast, setShowDoneToast] = useState(false);

  // 30분 완료 시 서버 세션 complete + 푸시 알림
  const completeCalledRef = useRef(false);
  useEffect(() => {
    if (timerStatus !== 'complete' || !sessionId || !isLoggedIn) {
      completeCalledRef.current = false;
      return;
    }
    if (completeCalledRef.current) return;
    completeCalledRef.current = true;

    fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    }).catch(() => {});
    fetch('/api/push/notify', { method: 'POST' }).catch(() => {});
  }, [timerStatus, sessionId, isLoggedIn]);

  // 탭 복귀 시 경과 시간 재계산
  useEffect(() => {
    if (timerStatus !== 'running' || !startedAt) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - startedAt >= CYCLE_MS) complete();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [timerStatus, startedAt, complete]);

  if (isPeeking) return null;

  // 현재 사이클 경과 시간
  const elapsedSec = startedAt ? Math.min(Math.floor((Date.now() - startedAt) / 1000), CYCLE_SEC) : 0;
  const totalSec = Math.min(waterCount * CYCLE_SEC + elapsedSec, DAILY_MAX_SEC);

  async function handleStart() {
    if (!isLoggedIn) return;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todos }),
      });
      if (res.ok) {
        const data = await res.json() as { sessionId: string; startedAt: string };
        startSession(data.sessionId, Date.parse(data.startedAt));
      }
    } catch { /* 세션 생성 실패 시에도 로컬 타이머 동작 */ }
  }

  async function handleWater() {
    if (isWatering) return;
    setIsWatering(true);
    try {
      const res = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      const data = await res.json() as { myWaterCount: number; userCreature: { stage: number; waterCount: number } };
      applyWaterResponse(data);
      if (data.myWaterCount >= TOTAL_SEGMENTS) {
        setShowDoneToast(true);
        setTimeout(() => setShowDoneToast(false), 4000);
      }
      reset();
    } catch { /* 실패 시 조용히 무시 */ }
    finally { setIsWatering(false); }
  }

  const isDailyDone = waterCount >= TOTAL_SEGMENTS;

  // 버튼 레이블 결정
  const buttonLabel = (() => {
    if (isDailyDone) return '오늘의 집중 완료';
    if (timerStatus === 'complete') return isWatering ? '물주는중' : '물주기';
    if (timerStatus === 'idle') return cycleCount > 0 ? '재개' : '시작';
    return '집중중'; // running
  })();

  const buttonDisabled = isDailyDone || timerStatus === 'running' || (timerStatus === 'complete' && isWatering);

  return (
    <div className="flex flex-col gap-sm border-t border-outline-variant pt-md">
      <style>{`
        @keyframes water-flow {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes dot-blink {
          0%, 20%  { opacity: 0.2; }
          50%      { opacity: 1; }
          100%     { opacity: 0.2; }
        }
        .dot-1 { animation: dot-blink 1.4s infinite 0s; }
        .dot-2 { animation: dot-blink 1.4s infinite 0.2s; }
        .dot-3 { animation: dot-blink 1.4s infinite 0.4s; }
      `}</style>

      {/* 12-segment water gauge */}
      <div className="flex gap-px w-full h-3">
        {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => {
          const isFilled = i < waterCount;
          const isCurrent = i === waterCount;
          const fillPct = isCurrent ? Math.min((elapsedSec / CYCLE_SEC) * 100, 100) : 0;

          return (
            <div key={i} className="flex-1 relative bg-surface-variant overflow-hidden">
              {(isFilled || (isCurrent && fillPct > 0)) && (
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: isFilled ? '100%' : `${fillPct}%`,
                    background: 'linear-gradient(90deg, #0ea5e9, #38bdf8, #22d3ee, #0ea5e9)',
                    backgroundSize: '200% 100%',
                    animation: 'water-flow 2s linear infinite',
                  }}
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
          <span className="text-primary">{formatDuration(totalSec)} / 6h</span>
        </span>
      </div>

      {/* 오늘 집중 완료 토스트 */}
      {showDoneToast && (
        <div className="font-mono text-label text-primary text-center py-xs">
          오늘 집중 고생하셨어요! 🌱
        </div>
      )}

      {/* 단일 버튼 */}
      <button
        onClick={!isDailyDone && timerStatus === 'complete' ? handleWater : handleStart}
        disabled={buttonDisabled}
        data-testid="timer-btn"
        className="w-full flex items-center justify-center gap-sm py-sm font-mono text-label uppercase tracking-wider border transition-none active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed bg-primary border-primary text-on-primary"
      >
        {timerStatus === 'running' && !isDailyDone ? (
          <span className="flex items-center gap-[1px]">
            집중중
            <span className="dot-1">.</span>
            <span className="dot-2">.</span>
            <span className="dot-3">.</span>
          </span>
        ) : (
          <>
            <Icon
              name={timerStatus === 'complete' && !isDailyDone ? 'water_drop' : 'play_arrow'}
              filled
              size={18}
            />
            {buttonLabel}
          </>
        )}
      </button>
    </div>
  );
}
