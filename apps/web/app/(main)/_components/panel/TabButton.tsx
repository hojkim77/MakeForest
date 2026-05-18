'use client';

export function TabButton({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`
        relative w-7 px-1 py-md
        border border-outline-variant
        font-mono text-label
        flex items-center justify-center
        transition-colors
        ${active
          ? 'bg-primary text-on-primary border-primary'
          : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'
        }
      `}
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
