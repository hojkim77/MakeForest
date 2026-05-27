'use client';

import { useEffect, useState } from 'react';

interface SpotlightProps {
  stepId: string;
  onRect: (rect: DOMRect | null) => void;
}

export function Spotlight({ stepId, onRect }: SpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-guide="${stepId}"]`);
    if (!el) {
      setRect(null);
      onRect(null);
      return;
    }

    const update = () => {
      const r = el.getBoundingClientRect();
      setRect(r);
      onRect(r);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [stepId, onRect]);

  const PADDING = 8;

  return (
    <div className="fixed inset-0 z-spotlight pointer-events-auto" aria-hidden>
      {rect ? (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - PADDING}
                y={rect.top - PADDING}
                width={rect.width + PADDING * 2}
                height={rect.height + PADDING * 2}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}
    </div>
  );
}
