'use client';

import { Icon } from '@/components/ui/Icon';
import type { SessionStatus } from '@makeforest/types';

interface TimerSectionProps {
  status: SessionStatus | 'IDLE';
  elapsedSec: number;
  thresholdSec: number;
  onStart: () => void;
  onStop: () => void;
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function TimerSection({ status, elapsedSec, thresholdSec, onStart, onStop }: TimerSectionProps) {
  const isRunning = status === 'RUNNING';
  // 현재 2시간 주기 내 진행도 (물주기 후 리셋된 값 기준)
  const progress = Math.min(elapsedSec / thresholdSec, 1);

  return (
    <div className="flex flex-col gap-sm border-t border-outline-variant pt-md">
      <div className="flex justify-between items-center font-mono text-pixel-stat">
        <span className="text-on-surface-variant text-label uppercase tracking-wider">
          다음 물주기까지
        </span>
        <span className="text-primary">
          {formatTime(Math.min(elapsedSec, thresholdSec))} / {formatTime(thresholdSec)}
        </span>
      </div>

      <div className="w-full h-1.5 bg-surface-variant overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <button
        onClick={isRunning ? onStop : onStart}
        className={[
          'flex items-center justify-center gap-sm py-sm font-mono text-label uppercase tracking-wider border transition-none active:translate-y-px',
          isRunning
            ? 'bg-surface-container-high border-outline text-on-surface'
            : 'bg-primary border-primary text-on-primary',
        ].join(' ')}
      >
        <Icon name={isRunning ? 'stop' : 'play_arrow'} filled size={18} />
        {isRunning ? '중지' : '시작'}
      </button>
    </div>
  );
}
