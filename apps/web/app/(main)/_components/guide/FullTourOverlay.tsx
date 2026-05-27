'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FullTourStepIdType } from '@makeforest/types';
import { FULL_TOUR_STEPS } from './steps';
import { Spotlight } from './Spotlight';
import { TooltipBubble } from './TooltipBubble';

const LS_KEY = 'guide:fullTour:step';

interface FullTourOverlayProps {
  steps: FullTourStepIdType[];
  onDone: (outcome: 'completed' | 'skipped') => void;
}

export function FullTourOverlay({ steps, onDone }: FullTourOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem(LS_KEY);
    if (saved !== null) {
      const n = parseInt(saved, 10);
      if (!isNaN(n) && n >= 0 && n < steps.length) return n;
    }
    return 0;
  });

  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(currentIndex));
  }, [currentIndex]);

  const stepId = steps[currentIndex]!;
  const config = FULL_TOUR_STEPS[stepId];

  const handleNext = useCallback(() => setCurrentIndex((i) => i + 1), []);
  const handlePrev = useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), []);
  const handleSkip = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    onDone('skipped');
  }, [onDone]);
  const handleComplete = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    onDone('completed');
  }, [onDone]);
  const handleRect = useCallback((r: DOMRect | null) => setAnchorRect(r), []);

  return (
    <>
      <div className="hidden md:block">
        <Spotlight stepId={stepId} onRect={handleRect} />
      </div>
      <div
        className="fixed z-guide-active
                   bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+8px)] right-4
                   md:bottom-auto md:right-auto
                   md:[top:var(--bubble-top)] md:[left:var(--bubble-left)] md:[transform:var(--bubble-transform)]"
        style={computeBubbleVars(derivePosition(stepId), anchorRect)}
      >
        <TooltipBubble
          stepIndex={currentIndex}
          totalSteps={steps.length}
          title={config.title}
          description={config.description}
          {...(currentIndex > 0 ? { onPrev: handlePrev } : {})}
          onNext={currentIndex < steps.length - 1 ? handleNext : handleComplete}
          onSkip={handleSkip}
          onComplete={handleComplete}
        />
      </div>
    </>
  );
}

type Position = 'top' | 'bottom' | 'left' | 'right' | 'center';

function derivePosition(stepId: FullTourStepIdType): Position {
  switch (stepId) {
    case 'panel.myNeighborhood':
    case 'panel.peek':
    case 'timer.start':
    case 'water.action':
    case 'creature.stage':
      return 'right';
    case 'map.modeToggle':
      return 'top';
    case 'community.entry':
    case 'mypage.entry':
      return 'bottom';
    default:
      return 'bottom';
  }
}

function computeBubbleVars(position: Position, anchorRect: DOMRect | null): React.CSSProperties {
  const BUBBLE_W = 288;
  const BUBBLE_H = 180;
  const GAP = 12;

  if (!anchorRect || position === 'center') {
    return {
      '--bubble-top': '50%',
      '--bubble-left': '50%',
      '--bubble-transform': 'translate(-50%, -50%)',
    } as React.CSSProperties;
  }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  let top: number;
  let left: number;

  switch (position) {
    case 'bottom':
      top = anchorRect.bottom + GAP;
      left = anchorRect.left + anchorRect.width / 2 - BUBBLE_W / 2;
      break;
    case 'top':
      top = anchorRect.top - BUBBLE_H - GAP;
      left = anchorRect.left + anchorRect.width / 2 - BUBBLE_W / 2;
      break;
    case 'right':
      top = anchorRect.top + anchorRect.height / 2 - BUBBLE_H / 2;
      left = anchorRect.right + GAP;
      break;
    case 'left':
      top = anchorRect.top + anchorRect.height / 2 - BUBBLE_H / 2;
      left = anchorRect.left - BUBBLE_W - GAP;
      break;
  }

  left = Math.max(8, Math.min(left, vw - BUBBLE_W - 8));
  top = Math.max(8, Math.min(top, vh - BUBBLE_H - 8));

  return {
    '--bubble-top': `${top}px`,
    '--bubble-left': `${left}px`,
    '--bubble-transform': 'none',
  } as React.CSSProperties;
}
