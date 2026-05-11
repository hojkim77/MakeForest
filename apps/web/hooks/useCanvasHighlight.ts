import { useCallback, useRef } from 'react';

const HL_ALPHA_MAX = 0.34;

export function useCanvasHighlight(renderRef: React.MutableRefObject<() => void>) {
  const hlRegionRef = useRef<string | null>(null);
  const hlAlphaRef = useRef(0);
  const hlTargetRef = useRef(0);
  const hlAnimRef = useRef<number | null>(null);

  const startHlAnim = useCallback(() => {
    if (hlAnimRef.current !== null) return;
    const step = () => {
      const diff = hlTargetRef.current - hlAlphaRef.current;
      if (Math.abs(diff) < 0.003) {
        hlAlphaRef.current = hlTargetRef.current;
        if (hlTargetRef.current === 0) hlRegionRef.current = null;
        renderRef.current();
        hlAnimRef.current = null;
        return;
      }
      hlAlphaRef.current += diff * 0.16;
      renderRef.current();
      hlAnimRef.current = requestAnimationFrame(step);
    };
    hlAnimRef.current = requestAnimationFrame(step);
  }, [renderRef]);

  const enterRegion = useCallback((rc: string) => {
    hlRegionRef.current = rc;
    hlTargetRef.current = HL_ALPHA_MAX;
    startHlAnim();
  }, [startHlAnim]);

  const leaveRegion = useCallback(() => {
    hlTargetRef.current = 0;
    startHlAnim();
  }, [startHlAnim]);

  return { hlRegionRef, hlAlphaRef, enterRegion, leaveRegion };
}
