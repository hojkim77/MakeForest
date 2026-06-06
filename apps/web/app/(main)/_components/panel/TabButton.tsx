'use client';

export function TabButton({
  label,
  active,
  onClick,
  badge,
  orientation = 'vertical',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
  orientation?: 'vertical' | 'horizontal';
}) {
  if (orientation === 'horizontal') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={[
          'px-sm py-xs font-mono text-label border-2 transition-colors',
          active
            ? 'border-primary bg-primary-container text-on-primary-container shadow-island'
            : 'border-outline bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
        ].join(' ')}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'relative border-2 font-mono text-label flex items-center justify-center transition-colors',
        'w-7 px-1 py-md',
        active
          ? 'bg-primary text-on-primary border-primary shadow-island'
          : 'bg-surface-container text-on-surface-variant border-outline hover:bg-surface-container-high',
      ].join(' ')}
      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
    >
      {label}
      {badge && (
        <span
          className="absolute top-1 right-0.5 font-mono text-[8px] leading-none text-primary"
          style={{ writingMode: 'horizontal-tb' }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
