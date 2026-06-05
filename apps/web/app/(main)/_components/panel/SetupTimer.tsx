'use client';

import { useState } from 'react';
import { WheelPicker } from './WheelPicker';
import { Button } from '@/shared/components/ui/Button';

// focusLengthMin: 5~120 step 5
const FOCUS_VALUES = Array.from({ length: 24 }, (_, i) => (i + 1) * 5);

function buildSegmentValues(focusLengthMin: number): number[] {
  const maxSegs = Math.floor(1440 / focusLengthMin);
  return Array.from({ length: maxSegs }, (_, i) => i + 1);
}

interface SetupTimerProps {
  initialFocusLengthMin: number;
  initialSegmentCount: number;
  onStart: (focusLengthMin: number, segmentCount: number) => Promise<void>;
  onConfigChange: (focusLengthMin: number, segmentCount: number) => Promise<void>;
  isPending?: boolean;
  canStart?: boolean;
}

export function SetupTimer({
  initialFocusLengthMin,
  initialSegmentCount,
  onStart,
  onConfigChange,
  isPending,
  canStart = true,
}: SetupTimerProps) {
  const [focusLengthMin, setFocusLengthMin] = useState(initialFocusLengthMin);
  const [segmentCount, setSegmentCount] = useState(initialSegmentCount);

  const segmentValues = buildSegmentValues(focusLengthMin);
  const safeSegmentCount = segmentValues.includes(segmentCount)
    ? segmentCount
    : Math.min(segmentCount, segmentValues[segmentValues.length - 1] ?? 1);

  const totalMin = focusLengthMin * safeSegmentCount;
  const capH = Math.floor(totalMin / 60);
  const capM = totalMin % 60;
  const capLabel = capH > 0 ? (capM > 0 ? `${capH}h ${capM}m` : `${capH}h`) : `${capM}m`;

  async function handleFocusChange(v: number) {
    const newSegs = buildSegmentValues(v);
    const clampedSeg = Math.min(segmentCount, newSegs[newSegs.length - 1] ?? 1);
    setFocusLengthMin(v);
    setSegmentCount(clampedSeg);
    await onConfigChange(v, clampedSeg);
  }

  async function handleSegmentChange(v: number) {
    setSegmentCount(v);
    await onConfigChange(focusLengthMin, v);
  }

  async function handleStart() {
    await onStart(focusLengthMin, safeSegmentCount);
  }

  return (
    <div className="flex flex-col gap-md border-t border-outline-variant pt-md">
      {/* wheel row */}
      <div className="flex gap-sm" style={{ height: 220 }}>
        <WheelPicker
          values={FOCUS_VALUES}
          value={focusLengthMin}
          onChange={(v) => void handleFocusChange(v)}
          unit="분"
        />
        <WheelPicker
          values={segmentValues}
          value={safeSegmentCount}
          onChange={(v) => void handleSegmentChange(v)}
          unit="회"
        />
      </div>

      {/* round dot preview */}
      <div className="flex flex-col gap-xs">
        <div className="flex flex-wrap gap-[3px] justify-center">
          {Array.from({ length: Math.min(safeSegmentCount, 24) }, (_, i) => (
            <div
              key={i}
              className="rounded-full bg-[#226143]"
              style={{ width: 8, height: 8, opacity: 0.8 }}
            />
          ))}
          {safeSegmentCount > 24 && (
            <span className="font-mono text-[10px] text-outline self-center ml-xs">
              +{safeSegmentCount - 24}
            </span>
          )}
        </div>
        <p className="font-mono text-[11px] text-outline text-center">
          총 {capLabel} 집중 · {safeSegmentCount}회 반복
        </p>
      </div>

      {/* start button */}
      <Button
        onClick={() => void handleStart()}
        disabled={isPending || !canStart}
        className="w-full uppercase"
        data-guide="timer.start"
      >
        {isPending ? (
          <span className="flex items-center gap-[1px]">
            시작중
            <span className="dot-1">.</span>
            <span className="dot-2">.</span>
            <span className="dot-3">.</span>
          </span>
        ) : '시작'}
      </Button>
    </div>
  );
}
