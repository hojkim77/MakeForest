'use client';

import { useActivityStream } from '@/hooks/useActivityStream';

const LEGEND = [
  { colorClass: 'bg-primary', label: 'Old Growth' },
  { colorClass: 'bg-secondary', label: 'Sapling' },
  { colorClass: 'bg-outline', label: 'Soil' },
] as const;

/**
 * Decorative overlay rendered on top of the map canvas.
 * Contains the floating title card and density legend.
 * Pointer-events are disabled on the grid; legend/title are interactive-safe.
 */
export function MapOverlay() {
  const activity = useActivityStream();
  const activeUsers = Object.values(activity).reduce((sum, n) => sum + n, 0);

  return (
    <>
      {/* Title card — top left */}
      <div className="absolute top-6 left-6 z-10 p-md bg-background border border-outline">
        <p className="font-mono text-pixel-stat text-primary-container uppercase tracking-wider">
          Pixel Forest
        </p>
        <p className="font-mono text-label text-outline mt-xs">
          Live Sync: {activeUsers.toLocaleString()} users active
        </p>
      </div>

      {/* Legend — bottom right */}
      <div className="absolute bottom-16 right-6 z-10 flex flex-col gap-sm p-md bg-inverse-surface border border-outline">
        {LEGEND.map(({ colorClass, label }) => (
          <div key={label} className="flex items-center gap-md">
            <div className={`w-3 h-3 ${colorClass}`} />
            <span className="font-mono text-label text-inverse-on-surface">{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
