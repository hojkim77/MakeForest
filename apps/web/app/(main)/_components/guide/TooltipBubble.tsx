'use client';

import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';

interface TooltipBubbleProps {
  stepIndex: number;
  totalSteps: number;
  title: string;
  description: string;
  onPrev?: () => void;
  onNext: () => void;
  onSkip: () => void;
  onComplete?: () => void;
}

export function TooltipBubble({
  stepIndex,
  totalSteps,
  title,
  description,
  onPrev,
  onNext,
  onSkip,
  onComplete,
}: TooltipBubbleProps) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  return (
    <Card border padding="md" className="w-72 bg-surface flex flex-col gap-sm shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-label text-outline uppercase tracking-wider">
          {stepIndex + 1} / {totalSteps}
        </span>
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-outline-variant uppercase">
          건너뛰기
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-xs">
        <p className="font-mono text-base font-bold text-on-surface">{title}</p>
        <p className="font-sans text-body-md text-on-surface-variant leading-relaxed">
          {description}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-sm mt-xs">
        {!isFirst && onPrev && (
          <Button variant="secondary" onClick={onPrev} className="flex-1 h-9 uppercase">
            이전
          </Button>
        )}
        {isLast ? (
          <Button onClick={onComplete ?? onNext} className="flex-1 h-9 uppercase">
            완료
          </Button>
        ) : (
          <Button onClick={onNext} className="flex-1 h-9 uppercase">
            다음
          </Button>
        )}
      </div>
    </Card>
  );
}
