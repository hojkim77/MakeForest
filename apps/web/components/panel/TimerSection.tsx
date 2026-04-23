'use client';

import { Icon } from '@/components/ui/Icon';
import type { SessionStatus } from '@makeforest/types';

interface TimerSectionProps {
  status: SessionStatus | 'IDLE';
  /** Seconds accumulated toward next water (max 7200 = 2h) */
  elapsedSec: number;
  /** Seconds required per water threshold */
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

  return (
    <div className="flex flex-col gap-sm border-t border-outline-variant pt-md">
      {/* Progress toward next water */}
      <div className="flex justify-between items-center font-mono text-pixel-stat">
        <span className="text-on-surface-variant text-label uppercase tracking-wider">
          다음 물주기까지
        </span>
        <span className="text-primary">
          {formatTime(elapsedSec)} / {formatTime(thresholdSec)}
        </span>
      </div>

      <div className="w-full h-1.5 bg-surface-variant overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-1000"
          style={{ width: `${Math.min((elapsedSec / thresholdSec) * 100, 100)}%` }}
        />
      </div>

      {/* Start / Stop */}
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
