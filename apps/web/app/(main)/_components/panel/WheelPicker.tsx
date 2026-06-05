'use client';

import { useRef, useEffect, useCallback } from 'react';

interface WheelPickerProps {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  itemHeight?: number;
  visible?: number;
}

const WP_ACTIVE = '#1B3A26';
const WP_IDLE = '#9AA295';
const WP_BAND = '#226143';

export function WheelPicker({
  values,
  value,
  onChange,
  unit,
  itemHeight = 44,
  visible = 5,
}: WheelPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const height = itemHeight * visible;
  const pad = (height - itemHeight) / 2;

  const applyStyles = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const center = el.scrollTop / itemHeight;
    el.querySelectorAll<HTMLElement>('[data-wp-item]').forEach((node) => {
      const i = Number(node.dataset.wpItem);
      const dist = Math.abs(i - center);
      node.style.opacity = String(Math.max(0.16, 1 - dist * 0.34));
      node.style.transform = `scale(${Math.max(0.66, 1 - dist * 0.14)})`;
      const active = dist < 0.5;
      node.style.fontWeight = active ? '700' : '500';
      node.style.color = active ? WP_ACTIVE : WP_IDLE;
    });
  }, [itemHeight]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const i = values.indexOf(value);
    const target = (i < 0 ? 0 : i) * itemHeight;
    const r1 = requestAnimationFrame(() => {
      el.scrollTop = target;
      requestAnimationFrame(() => {
        el.scrollTop = target;
        applyStyles();
      });
    });
    return () => cancelAnimationFrame(r1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    applyStyles();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      let i = Math.round(el.scrollTop / itemHeight);
      i = Math.max(0, Math.min(values.length - 1, i));
      const target = i * itemHeight;
      if (Math.abs(el.scrollTop - target) > 1) {
        el.scrollTo({ top: target, behavior: 'smooth' });
      }
      const v = values[i];
      if (v !== undefined && v !== value) onChange(v);
    }, 110);
  };

  const clickItem = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: i * itemHeight, behavior: 'smooth' });
  };

  return (
    <div style={{ position: 'relative', height, flex: 1 }}>
      {/* center selection band */}
      <div
        style={{
          position: 'absolute',
          left: 6,
          right: 6,
          top: pad,
          height: itemHeight,
          borderTop: `2px solid ${WP_BAND}`,
          borderBottom: `2px solid ${WP_BAND}`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
      {unit && (
        <div
          style={{
            position: 'absolute',
            right: 14,
            top: pad,
            height: itemHeight,
            display: 'flex',
            alignItems: 'center',
            zIndex: 4,
            pointerEvents: 'none',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            color: WP_BAND,
          }}
        >
          {unit}
        </div>
      )}
      <div
        ref={ref}
        onScroll={handleScroll}
        style={{
          height,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitMaskImage:
            'linear-gradient(180deg, transparent 0%, #000 26%, #000 74%, transparent 100%)',
          maskImage:
            'linear-gradient(180deg, transparent 0%, #000 26%, #000 74%, transparent 100%)',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ height: pad }} />
        {values.map((v, i) => (
          <div
            key={v}
            data-wp-item={i}
            onClick={() => clickItem(i)}
            style={{
              height: itemHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 26,
              transition: 'opacity .12s ease, transform .12s ease, color .12s ease',
              userSelect: 'none',
            }}
          >
            {v}
          </div>
        ))}
        <div style={{ height: pad }} />
      </div>
    </div>
  );
}
