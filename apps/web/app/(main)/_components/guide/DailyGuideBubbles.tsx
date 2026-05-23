'use client';

import { useCallback, useState } from 'react';
import type { DailyGuideStepIdType, GuideStateResType } from '@makeforest/types';
import { buildDailyStepConfig } from './steps';
import { TooltipBubble } from './TooltipBubble';

type DailyPayload = Extract<GuideStateResType, { kind: 'daily' }>['payload'];

interface DailyGuideBubblesProps {
  steps: DailyGuideStepIdType[];
  payload: DailyPayload;
  onDone: (outcome: 'completed' | 'skipped') => void;
}

export function DailyGuideBubbles({ steps, payload, onDone }: DailyGuideBubblesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const stepId = steps[currentIndex]!;
  const config = buildDailyStepConfig(stepId, payload);

  const handleNext = useCallback(() => setCurrentIndex((i) => i + 1), []);
  const handlePrev = useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), []);
  const handleSkip = useCallback(() => onDone('skipped'), [onDone]);
  const handleComplete = useCallback(() => onDone('completed'), [onDone]);

  return (
    <div style={{ pointerEvents: 'none' }} className="fixed inset-0 z-[150]">
      <div style={{ pointerEvents: 'auto' }} className="absolute bottom-6 right-6">
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
    </div>
  );
}
