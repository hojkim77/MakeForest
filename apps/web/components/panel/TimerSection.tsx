'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { SessionStatus } from '@makeforest/types';

interface TimerSectionProps {
  status: SessionStatus | 'IDLE';
  elapsedSec: number;
  waterThresholdSec: number;
  maxSec: number;
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

export function TimerSection({ status, elapsedSec, waterThresholdSec, maxSec, onStart, onStop }: TimerSectionProps) {
  const isRunning = status === 'RUNNING';
  const progress = Math.min(elapsedSec / maxSec, 1);
  const thresholdMarker = waterThresholdSec / maxSec;

  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col gap-sm border-t border-outline-variant pt-md">
      <div className="flex justify-between items-center font-mono text-pixel-stat">
        <div className="flex items-center gap-xs text-on-surface-variant text-label uppercase tracking-wider">
          <span>다음 물주기까지</span>
          <div className="relative" ref={infoRef}>
            <button
              onClick={() => setInfoOpen((v) => !v)}
              className="flex items-center justify-center w-4 h-4 text-outline hover:text-on-surface transition-none"
              aria-label="물주기 안내"
            >
              <Icon name="info" size={14} />
            </button>
            {infoOpen && (
              <div className="absolute left-0 top-5 z-20 w-52 bg-inverse-surface text-inverse-on-surface font-mono text-xs p-sm border border-outline shadow-md">
                <p className="leading-relaxed">
                  <span className="text-primary-fixed">30분</span> 집중하면 물주기 가능
                </p>
                <p className="leading-relaxed mt-0.5">
                  최대 <span className="text-primary-fixed">2시간</span>까지 누적 (초과분 미반영)
                </p>
                <button
                  onClick={() => setInfoOpen(false)}
                  className="mt-sm text-outline hover:text-inverse-on-surface transition-none"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
        <span className="text-primary">
          {formatTime(Math.min(elapsedSec, maxSec))} / {formatTime(maxSec)}
        </span>
      </div>

      {/* 프로그레스 바 (2h 기준) + 30분 마커 */}
      <div className="relative w-full h-1.5 bg-surface-variant overflow-visible">
        <div
          className="h-full bg-primary transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
        {/* 30분 임계선 */}
        <div
          className="absolute top-0 h-1.5 w-px bg-outline-variant"
          style={{ left: `${thresholdMarker * 100}%` }}
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
