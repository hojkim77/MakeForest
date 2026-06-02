interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return (
    <div
      role="separator"
      className={['border-t border-outline-variant', className].filter(Boolean).join(' ')}
    />
  );
}
