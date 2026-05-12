'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CreatureSprite } from '@/components/panel/CreatureSprite';

const TOTAL_STEPS = 6;
const CREATURE_STAGES = [0, 2, 6, 9] as const;

interface StepMeta {
  stepLabel: string;
  title: string;
  sub: string;
  body: string;
  dark?: boolean;
}

const STEPS: StepMeta[] = [
  {
    stepLabel: 'Step 1',
    title: '집중 시작 & 물주기',
    sub: 'Focus & Watering',
    body: '타이머를 시작하면 땅속에 씨앗이 심어집니다. 30분 집중이 끝나면 물방울이 생성되어 씨앗을 깨울 수 있어요. 하루 최대 12번 물을 줄 수 있습니다.',
  },
  {
    stepLabel: 'Step 2',
    title: '싹이 트다',
    sub: 'Sprouting · Stage 3',
    body: '반복되는 집중 세션이 씨앗을 작은 나무로 키웁니다. 매일 자정 오늘의 물주기 횟수가 집계되어 생명체가 성장해요.',
  },
  {
    stepLabel: 'Step 3',
    title: '성장',
    sub: 'Growth · Stage 7',
    body: '꾸준한 집중이 더 강하고 무성한 나무를 만듭니다. 하루도 빠짐없이 집중하면 전설의 나무로 나아갈 수 있어요.',
  },
  {
    stepLabel: 'Step 4',
    title: '세계수',
    sub: 'World Tree · Stage 10',
    body: '최고의 집중과 헌신이 전설 속 세계수를 탄생시켰습니다. 이 나무는 이제 더 큰 숲을 이루기 위해 동네로 나아갑니다.',
  },
  {
    stepLabel: 'Step 5',
    title: '우리의 숲',
    sub: 'Pixel Forest',
    body: '당신의 나무가 이웃들의 나무와 합쳐져 동네의 디지털 숲을 형성합니다. 집중하는 사람이 많을수록 숲은 더 짙고 무성해져요.',
    dark: true,
  },
  {
    stepLabel: 'Step 6',
    title: '내 동네',
    sub: 'My Neighborhood',
    body: '집중은 내가 등록한 동네에서만. 지도 위에서 우리 동네 숲이 얼마나 자랐는지 직접 확인해봐요.',
    dark: true,
  },
];

// ── Procedural pixel map (used for steps 4-5) ─────────────────
function PixelMap({ zoomed }: { zoomed: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = (canvas.width = canvas.offsetWidth);
    const H = (canvas.height = canvas.offsetHeight);
    const CELL = 4;

    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0xffffffff;
    };

    ctx.fillStyle = '#0e2318';
    ctx.fillRect(0, 0, W, H);

    for (let x = 0; x < W; x += CELL) {
      for (let y = 0; y < H; y += CELL) {
        const r = rand();
        let color: string | null = null;
        if (r < 0.2) color = '#707972';
        else if (r < 0.33) color = '#2e7d1c';
        else if (r < 0.42) color = '#5ca832';
        else if (r < 0.46) color = '#a8d55c';
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, CELL - 1, CELL - 1);
        }
      }
    }

    const hx = Math.floor((W * 0.44) / CELL) * CELL;
    const hy = Math.floor((H * 0.4) / CELL) * CELL;
    for (let dx = -24; dx < 24; dx += CELL) {
      for (let dy = -16; dy < 16; dy += CELL) {
        const nx = hx + dx;
        const ny = hy + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) {
          ctx.fillStyle = '#c8e87c';
          ctx.fillRect(nx, ny, CELL - 1, CELL - 1);
        }
      }
    }
  }, []);

  return (
    <div className="w-full h-full overflow-hidden relative">
      <div
        style={{
          width: '100%',
          height: '100%',
          transformOrigin: '44% 40%',
          transform: zoomed ? 'scale(4)' : 'scale(1)',
          transition: zoomed
            ? 'transform 2.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            : 'transform 0.6s ease',
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
        <div
          className="absolute font-mono text-[10px] text-primary-fixed bg-[#0e2318]/90 px-1 py-0.5 border border-primary/40 whitespace-nowrap pointer-events-none"
          style={{ top: '41%', left: '41%' }}
        >
          ▲ 역삼1동
        </div>
      </div>
    </div>
  );
}

// ── Main interactive section ───────────────────────────────────
export function HowItWorksSection() {
  const [step, setStep] = useState(0);
  const [leftIn, setLeftIn] = useState(true);
  const [mapZoomed, setMapZoomed] = useState(false);

  const navigating = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const isDark = STEPS[step]?.dark ?? false;

  const navigate = useCallback(
    (dir: 1 | -1) => {
      const next = step + dir;
      if (next < 0 || next >= TOTAL_STEPS) return;
      if (navigating.current) return;
      navigating.current = true;

      setLeftIn(false);
      setTimeout(() => {
        setStep(next);
        setLeftIn(true);
        if (next === 5) {
          setTimeout(() => setMapZoomed(true), 300);
        } else {
          setMapZoomed(false);
        }
        setTimeout(() => { navigating.current = false; }, 320);
      }, 280);
    },
    [step],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (e.deltaX > 5) navigate(1);
      else if (e.deltaX < -5) navigate(-1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [navigate]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0]!.clientX;
      touchStartY.current = e.touches[0]!.clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0]!.clientX - touchStartX.current;
      const dy = e.changedTouches[0]!.clientY - touchStartY.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigate]);

  const current = STEPS[step]!;
  const creatureStage = CREATURE_STAGES[Math.min(step, 3)]!;

  return (
    <section
      ref={sectionRef}
      id="how"
      style={{ background: isDark ? '#31302b' : '#FAF9F7', transition: 'background 0s' }}
    >
      {!isDark && <div className="absolute inset-0 pixel-bg pointer-events-none" />}

      {/* Section header */}
      <div className="absolute top-20 left-0 right-0 z-30 px-6 flex justify-between items-center max-w-5xl mx-auto w-full pointer-events-none">
        <div className="flex items-center gap-3">
          <h2
            className="font-mono text-xl tracking-tighter px-2 py-1 border"
            style={{
              color: isDark ? '#b0f1ca' : '#226143',
              background: isDark ? 'rgba(49,48,43,0.9)' : 'rgba(250,249,247,0.9)',
              borderColor: isDark ? 'rgba(176,241,202,0.2)' : '#E8E4DC',
            }}
          >
            HOW IT WORKS
          </h2>
          <span
            className="font-mono text-xs px-2 py-1 border"
            style={{
              color: isDark ? '#c0c9c0' : '#707972',
              background: isDark ? 'rgba(49,48,43,0.9)' : '#f7f3eb',
              borderColor: isDark ? 'rgba(192,201,192,0.2)' : '#E8E4DC',
            }}
          >
            {String(step + 1).padStart(2, '0')}/06
          </span>
        </div>
        {/* Pagination dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-2 transition-all duration-300"
              style={{
                width: i === step ? 24 : 8,
                background: i === step ? '#226143' : isDark ? '#404942' : '#c0c9c0',
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ top: 48 }}>
        <div className="container mx-auto max-w-5xl px-6 flex flex-col md:flex-row items-center gap-12">

          {/* Left: step text */}
          <div
            className="fade-left w-full md:w-1/2 space-y-4 pointer-events-auto"
            style={{ opacity: leftIn ? 1 : 0 }}
          >
            <span
              className="font-mono text-xs uppercase tracking-widest"
              style={{ color: isDark ? '#b0f1ca' : '#226143' }}
            >
              {current.stepLabel}
            </span>
            <h3
              className="font-mono text-4xl leading-snug"
              style={{ color: isDark ? '#f4f0e8' : '#1c1c17' }}
            >
              {current.title}
              <br />
              <span className="text-2xl" style={{ color: isDark ? '#c0c9c0' : '#707972' }}>
                {current.sub}
              </span>
            </h3>
            <p className="font-sans leading-relaxed max-w-sm" style={{ color: isDark ? '#c0c9c0' : '#404942' }}>
              {current.body}
            </p>

            {/* Step-specific extras */}
            {step === 0 && (
              <div className="flex items-center gap-4 pt-1">
                <div className="bg-white border border-[#E8E4DC] px-4 py-3 flex items-center gap-3">
                  <div className="spin-slow w-7 h-7 border-2 border-primary-container border-t-primary rounded-full" />
                  <span className="font-mono font-bold text-xl">30:00</span>
                </div>
                <div className="bg-primary-fixed border border-[#E8E4DC] px-3 py-1.5 font-mono text-xs text-primary">
                  +1 WATER DROP
                </div>
              </div>
            )}

            {(step === 1 || step === 2 || step === 3) && (
              <div className="flex gap-1 pt-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-4 border border-primary/40"
                    style={{ background: i < step * 3 ? '#226143' : 'transparent' }}
                  />
                ))}
              </div>
            )}

            {step === 4 && (
              <div
                className="border px-4 py-3 font-mono text-xs space-y-2"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(192,201,192,0.2)' }}
              >
                <div className="flex justify-between">
                  <span style={{ color: '#c0c9c0' }}>역삼1동 오늘 물주기</span>
                  <span style={{ color: '#b0f1ca' }} className="font-bold">247회</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#c0c9c0' }}>활동 인원</span>
                  <span style={{ color: '#b0f1ca' }} className="font-bold">38명</span>
                </div>
              </div>
            )}

            {step === 5 && (
              <div
                className="border px-4 py-3 font-mono text-xs"
                style={{ background: 'rgba(176,241,202,0.08)', borderColor: 'rgba(176,241,202,0.2)', color: '#b0f1ca' }}
              >
                ✓ 타이머와 물주기는 내가 등록한 동네에서만 작동해요
              </div>
            )}
          </div>

          {/* Right: creature / map */}
          <div className="w-full md:w-1/2 flex justify-center">
            <div className="relative" style={{ width: 420, height: 360 }}>

              {/* Creature box — fades out on step 4+ */}
              <div
                className="absolute inset-0 flex items-center justify-center fade-right"
                style={{ opacity: step < 4 ? 1 : 0, pointerEvents: step < 4 ? 'auto' : 'none' }}
              >
                <div className="relative w-72 h-72 md:w-96 md:h-96 bg-surface-container border border-[#E8E4DC] p-4 flex items-center justify-center">
                  {step === 0 && (
                    <div className="absolute inset-0 flex items-start justify-center pt-6 z-10 pointer-events-none">
                      <span
                        className="material-symbols-outlined text-primary-container water-drop"
                        style={{ fontSize: '3.5rem' }}
                      >
                        water_drop
                      </span>
                    </div>
                  )}
                  <div className="breathe">
                    <CreatureSprite stage={creatureStage} size={220} />
                  </div>
                </div>
              </div>

              {/* Map box — fades in on step 4+ */}
              <div
                className="absolute inset-0 fade-right"
                style={{ opacity: step >= 4 ? 1 : 0, pointerEvents: step >= 4 ? 'auto' : 'none' }}
              >
                <div
                  className="relative w-full h-full border"
                  style={{ borderColor: 'rgba(192,201,192,0.2)' }}
                >
                  <PixelMap zoomed={mapZoomed} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Swipe hint */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30 pointer-events-none">
        <span className="font-mono text-s" style={{ color: isDark ? '#b0f1ca' : '#226143', opacity: 0.5 }}>
          ← swipe or use arrow keys →
        </span>
      </div>
    </section>
  );
}
