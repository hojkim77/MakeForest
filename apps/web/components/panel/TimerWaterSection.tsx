'use client';

import { useState } from 'react';
import type { SessionStatus } from '@makeforest/types';
import { Icon } from '@/components/ui/Icon';

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

interface TimerWaterSectionProps {
  status: SessionStatus | 'IDLE';
  elapsedSec: number;
  myWaterCount: number;
  canWater: boolean;
  autoPaused?: boolean;
  onStart: () => void;
  onStop: () => void;
  onResume: () => void;
  onWater: () => void;
}

export function TimerWaterSection({
  status,
  elapsedSec,
  myWaterCount,
  canWater,
  autoPaused = false,
  onStart,
  onStop,
  onResume,
  onWater,
}: TimerWaterSectionProps) {
  const isRunning = status === 'RUNNING';
  const isPaused = status === 'PAUSED';
  const totalSec = Math.min(myWaterCount * SEGMENT_SEC + elapsedSec, DAILY_MAX_SEC);

  const [showInfo, setShowInfo] = useState(false);

  function dismissInfo() {
    setShowInfo(!showInfo);
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
              left: `${Math.min((myWaterCount + 0.5) / TOTAL_SEGMENTS, 1) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            집중하느라 고생하셨어요! 물을 주세요 💧
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-primary" />
          </div>
        )}
        {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => {
          const isFilled = i < myWaterCount;
          const isCurrent = i === myWaterCount;
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

      {/* pomodoro description */}
      {showInfo && (
        <div className="relative bg-surface-container-high border border-outline-variant p-sm font-mono text-label text-on-surface-variant">
          <button
            onClick={dismissInfo}
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
        {/* State button (left) */}
        <div className="flex-1">
          {status === 'IDLE' && (
            <button
              onClick={onStart}
              className="w-full flex items-center justify-center gap-sm py-sm font-mono text-label uppercase tracking-wider border bg-primary border-primary text-on-primary transition-none active:translate-y-px"
            >
              <Icon name="play_arrow" filled size={18} />
              시작
            </button>
          )}
          {isRunning && (
            <button
              onClick={onStop}
              className="w-full flex items-center justify-center gap-sm py-sm font-mono text-label uppercase tracking-wider border bg-surface-container-high border-outline text-on-surface transition-none active:translate-y-px"
            >
              <Icon name="stop" filled size={18} />
              중지
            </button>
          )}
          {isPaused && (
            <button
              onClick={onResume}
              disabled={autoPaused}
              className="w-full flex items-center justify-center gap-sm py-sm font-mono text-label uppercase tracking-wider border bg-primary border-primary text-on-primary transition-none active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="play_arrow" filled size={18} />
              재개
            </button>
          )}
        </div>

        {/* Water button (right) */}
        <button
          onClick={onWater}
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
