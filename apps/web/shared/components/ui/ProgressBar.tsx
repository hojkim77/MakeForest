import { cn } from '@/shared/lib/cn';

interface ProgressBarProps {
  value: number;
  variant?: 'default' | 'water';
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

const sizeClasses = {
  sm: 'h-2',
  md: 'h-3',
};

const variantClasses = {
  default: 'bg-primary',
  water: 'animate-water-flow',
};

export function ProgressBar({
  value,
  variant = 'default',
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn('w-full overflow-hidden rounded bg-surface-variant', sizeClasses[size], className)}
    >
      <div
        style={{ width: `${clamped}%` }}
        className={cn('h-full transition-all', variantClasses[variant])}
      />
    </div>
  );
}
