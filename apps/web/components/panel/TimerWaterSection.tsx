'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMapStore, useTimerStore, useWaterStore } from '@/store';
import { Icon } from '@/components/ui/Icon';

const WATER_THRESHOLD_SEC = 30 * 60;
const TOTAL_SEGMENTS = 12;
const SEGMENT_SEC = 1800;
const DAILY_MAX_SEC = 21600;

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

  const { status: timerStatus, elapsedSec, autoPaused, todos, start, pause } = useTimerStore();
  const { waterCount, isWatering, setIsWatering, applyWaterResponse } = useWaterStore();

  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!autoPaused || !isLoggedIn) return;
    const { sessionId } = useTimerStore.getState();
    if (sessionId) {
      fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      }).catch(() => {});
    }
    fetch('/api/push/notify', { method: 'POST' }).catch(() => {});
  }, [autoPaused, isLoggedIn]);

  if (isPeeking) return null;

  const canWater =
    isLoggedIn &&
    !isWatering &&
    (timerStatus === 'RUNNING' || (timerStatus === 'PAUSED' && autoPaused)) &&
    elapsedSec >= WATER_THRESHOLD_SEC;

  const totalSec = Math.min(waterCount * SEGMENT_SEC + elapsedSec, DAILY_MAX_SEC);
  const isRunning = timerStatus === 'RUNNING';
  const isPaused = timerStatus === 'PAUSED';

  async function handleStart() {
    if (!isLoggedIn) return;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationSec: 7200, todos }),
      });
      if (res.ok) {
        const data = await res.json() as { sessionId: string };
        useTimerStore.getState().setSession(data.sessionId);
      }
    } catch { /* 세션 생성 실패 시에도 로컬 타이머는 동작 */ }
    start();
  }

  async function handleStop() {
    pause();
    const { sessionId } = useTimerStore.getState();
    if (!sessionId) return;
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });
    } catch { /* 실패 시 조용히 무시 */ }
  }

  async function handleResume() {
    const { sessionId } = useTimerStore.getState();
    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resume' }),
        });
      } catch { /* 실패 시 조용히 무시 */ }
    }
    start();
  }

  async function handleWater() {
    if (isWatering) return;
    setIsWatering(true);
    const totalElapsedSec = waterCount * 1800 + elapsedSec;
    try {
      const res = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalElapsedSec }),
      });
      if (!res.ok) return;
      const data = await res.json() as { myWaterCount: number; userCreature: { stage: number; waterCount: number } };
      applyWaterResponse(data);
      useTimerStore.getState().resetWaterProgress();
    } catch { /* 실패 시 조용히 무시 */ }
    finally { setIsWatering(false); }
  }

  return (
    <div className="flex flex-col gap-sm border-t border-outline-variant pt-md">
      <style>{`
        @keyframes water-flow {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>

      {/* 12-segment water gauge */}
      <div className="relative flex gap-px w-full h-3">
        {autoPaused && isPaused && (
          <div
            className="absolute bottom-full mb-2 whitespace-nowrap bg-primary text-on-primary font-mono text-xs px-2 py-1 pointer-events-none z-10"
            style={{
              left: `${Math.min((waterCount + 0.5) / TOTAL_SEGMENTS, 1) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            집중하느라 고생하셨어요! 물을 주세요 💧
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-primary" />
          </div>
        )}
        {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => {
          const isFilled = i < waterCount;
          const isCurrent = i === waterCount;
          const fillPct = isCurrent
            ? Math.min((elapsedSec / SEGMENT_SEC) * 100, 100)
            : 0;

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

      {/* Timer + total progress */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-xs">
          <span
            className="font-mono tabular-nums text-3xl leading-none text-on-surface"
            data-testid="timer-display"
          >
            {formatTimer(elapsedSec)}
          </span>
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="text-outline hover:text-on-surface transition-none p-0.5"
            aria-label="뽀모도로 설명"
          >
            <Icon name="info" size={14} />
          </button>
        </div>
        <span className="font-mono text-label text-on-surface-variant uppercase tracking-wider">
          오늘 집중&nbsp;
          <span className="text-primary">{formatDuration(totalSec)} / 6h</span>
        </span>
      </div>

      {showInfo && (
        <div className="relative bg-surface-container-high border border-outline-variant p-sm font-mono text-label text-on-surface-variant">
          <button
            onClick={() => setShowInfo(false)}
            className="absolute top-1 right-1 text-outline hover:text-on-surface transition-none"
            aria-label="닫기"
          >
            <Icon name="close" size={14} />
          </button>
          <p className="font-semibold text-on-surface mb-xs">뽀모도로 집중법</p>
          <ul className="space-y-xs list-none">
            <li>· 30분 집중하면 물주기 1회 가능</li>
            <li>· 물주기로 동네 생명체를 성장시켜요</li>
            <li>· 하루 최대 12회 (6시간) 집중 가능</li>
          </ul>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-sm">
        <div className="flex-1">
          {timerStatus === 'IDLE' && (
            <button
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-sm py-sm font-mono text-label uppercase tracking-wider border bg-primary border-primary text-on-primary transition-none active:translate-y-px"
            >
              <Icon name="play_arrow" filled size={18} />
              시작
            </button>
          )}
          {isRunning && (
            <button
              onClick={handleStop}
              className="w-full flex items-center justify-center gap-sm py-sm font-mono text-label uppercase tracking-wider border bg-surface-container-high border-outline text-on-surface transition-none active:translate-y-px"
            >
              <Icon name="stop" filled size={18} />
              중지
            </button>
          )}
          {isPaused && (
            <button
              onClick={handleResume}
              disabled={autoPaused}
              className="w-full flex items-center justify-center gap-sm py-sm font-mono text-label uppercase tracking-wider border bg-primary border-primary text-on-primary transition-none active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="play_arrow" filled size={18} />
              재개
            </button>
          )}
        </div>

        <button
          onClick={handleWater}
          disabled={!canWater}
          data-testid="water-btn"
          className="flex items-center justify-center gap-xs px-lg py-sm font-mono text-label uppercase tracking-wider border border-primary bg-primary-container text-on-primary transition-none active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon name="water_drop" filled size={18} />
          물 주기
        </button>
      </div>
    </div>
  );
}
