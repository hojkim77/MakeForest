interface IconProps {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
}

/**
 * Material Symbols Outlined wrapper.
 * Use `filled` to toggle the FILL axis (icon becomes solid).
 */
export function Icon({ name, filled = false, size = 24, className = '' }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  );
}
