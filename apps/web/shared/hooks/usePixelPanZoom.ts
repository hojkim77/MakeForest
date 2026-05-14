import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_SCALE = 8;
const DRAG_THRESHOLD = 5;

interface Transform { scale: number; tx: number; ty: number }

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function constrain({ scale, tx, ty }: Transform, vw: number, vh: number, cw: number, ch: number): Transform {
  const sw = cw * scale;
  const sh = ch * scale;
  return {
    scale,
    tx: sw <= vw ? (vw - sw) / 2 : clamp(tx, vw - sw, 0),
    ty: sh <= vh ? (vh - sh) / 2 : clamp(ty, vh - sh, 0),
  };
}

interface UsePixelPanZoomOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  canvasW: number;
  canvasH: number;
  isForestRef: React.RefObject<boolean>;
}

export function usePixelPanZoom({ containerRef, canvasW, canvasH, isForestRef }: UsePixelPanZoomOptions) {
  const minScaleRef = useRef(0.1);
  const [pixelT, setPixelT] = useState<Transform>({ scale: 0.1, tx: 0, ty: 0 });

  const suppressNextClick = useRef(false);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (isForestRef.current) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const cx = e.clientX - left;
    const cy = e.clientY - top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setPixelT((prev) => {
      const s = clamp(prev.scale * factor, minScaleRef.current, MAX_SCALE);
      const r = s / prev.scale;
      return constrain({ scale: s, tx: cx - (cx - prev.tx) * r, ty: cy - (cy - prev.ty) * r }, width, height, canvasW, canvasH);
    });
  }, [containerRef, isForestRef, canvasW, canvasH]);

  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (isForestRef.current) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, [isForestRef]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPixelT((prev) => constrain({ ...prev, tx: prev.tx + dx, ty: prev.ty + dy }, width, height, canvasW, canvasH));
  }, [containerRef, canvasW, canvasH]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (dragging.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        suppressNextClick.current = true;
        setTimeout(() => { suppressNextClick.current = false; }, 50);
      }
    }
    dragging.current = false;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, containerRef]);

  const constrainPixelT = useCallback((t: Transform, vw: number, vh: number) => {
    return constrain(t, vw, vh, canvasW, canvasH);
  }, [canvasW, canvasH]);

  return { pixelT, setPixelT, minScaleRef, suppressNextClick, constrainPixelT };
}
