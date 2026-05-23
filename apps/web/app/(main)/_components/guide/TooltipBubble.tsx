'use client';

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
    <div className="w-72 bg-surface border border-outline-variant p-md flex flex-col gap-sm shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-label text-outline uppercase tracking-wider">
          {stepIndex + 1} / {totalSteps}
        </span>
        <button
          onClick={onSkip}
          className="font-mono text-label text-outline-variant hover:text-on-surface uppercase tracking-wider"
        >
          건너뛰기
        </button>
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
          <button
            onClick={onPrev}
            className="flex-1 h-9 border border-outline-variant font-mono text-label uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high active:translate-y-px transition-none"
          >
            이전
          </button>
        )}
        {isLast ? (
          <button
            onClick={onComplete ?? onNext}
            className="flex-1 h-9 bg-primary text-on-primary font-mono text-label uppercase tracking-wider active:translate-y-px transition-none"
          >
            완료
          </button>
        ) : (
          <button
            onClick={onNext}
            className="flex-1 h-9 bg-primary text-on-primary font-mono text-label uppercase tracking-wider active:translate-y-px transition-none"
          >
            다음
          </button>
        )}
      </div>
    </div>
  );
}
