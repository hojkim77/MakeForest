import type React from 'react';
import { CreatureSprite } from '@/shared/components/ui/CreatureSprite';
import { Icon } from '@/shared/components/ui/Icon';

const HEATMAP_COLORS = ['#bbf7d0', '#4ade80', '#16a34a', '#14532d'];

function MapMiniVisual() {
  const COLS = 5;
  const ROWS = 4;
  const activeCells = new Set([2, 7, 13, 17, 3]);

  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: ROWS }).map((_, row) => (
        <div key={row} className="flex gap-0.5">
          {Array.from({ length: COLS }).map((_, col) => {
            const idx = row * COLS + col;
            const isActive = activeCells.has(idx);
            return (
              <div
                key={col}
                className={`w-3 h-3 ${isActive ? 'bg-primary animate-pulse' : 'bg-surface-container-high'}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PomodoroMiniVisual() {
  const blocks = [
    { label: '30m', focus: true },
    { label: '5m', focus: false },
    { label: '30m', focus: true },
    { label: '5m', focus: false },
    { label: '30m', focus: true },
  ];
  return (
    <div className="flex items-end gap-1">
      {blocks.map((b, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className={`w-7 ${b.focus ? 'h-8 bg-primary' : 'h-4 bg-primary-fixed border border-primary/30'}`}
          />
          <span className="font-mono text-[9px] text-on-surface-variant">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function TimerMiniVisual() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <div className="spin-slow w-7 h-7 border-2 border-primary-container border-t-primary rounded-full" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
      </div>
      <div className="bg-primary-fixed border border-primary/20 px-2.5 py-1 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>notifications</span>
        <span className="font-mono text-[11px] text-primary font-bold whitespace-nowrap">집중 완료!</span>
      </div>
    </div>
  );
}

function ToastMiniVisual() {
  return (
    <div className="bg-surface border-2 border-outline shadow-island px-2.5 py-1.5 flex items-center gap-1.5 w-fit">
      <span className="text-xs">💧</span>
      <span className="font-mono text-[10px] text-on-surface whitespace-nowrap">이웃이 물을 줬어요</span>
    </div>
  );
}

function EvolutionMiniVisual() {
  return (
    <div className="flex items-center gap-1.5">
      <CreatureSprite stage={0} size={24} />
      <span className="font-mono text-[10px] text-on-surface-variant">→</span>
      <CreatureSprite stage={4} size={24} />
      <span className="font-mono text-[10px] text-on-surface-variant">→</span>
      <CreatureSprite stage={9} size={24} />
    </div>
  );
}

function HeatmapMiniVisual() {
  return (
    <div className="flex gap-1 items-end">
      {HEATMAP_COLORS.map((color, i) => (
        <div
          key={i}
          style={{ background: color, width: 12, height: 12 + i * 4 }}
        />
      ))}
    </div>
  );
}

interface Feature {
  icon: string;
  sub: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}

function FeatureCard({ feature: f }: { feature: Feature }) {
  return (
    <div className="bg-surface border-2 border-outline shadow-island p-6 flex flex-col gap-4">
      {/* Mini visual */}
      <div className="h-14 flex items-center">{f.visual}</div>

      {/* Icon + labels */}
      <div>
        <span className="font-mono text-xs uppercase tracking-wider text-primary block mb-1.5">
          {f.sub}
        </span>
        <div className="flex items-start gap-2">
          <Icon name={f.icon} size={20} className="text-primary mt-0.5 shrink-0" />
          <p className="font-mono text-base font-bold text-on-surface leading-snug">{f.title}</p>
        </div>
      </div>

      <p className="font-sans text-sm text-on-surface-variant leading-relaxed">{f.body}</p>
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    icon: 'group',
    sub: 'Community Map',
    title: '지금 이 순간, 함께',
    body: '집중 중인 이웃이 지도 위에 나타나요. 나만 하는 게 아니에요.',
    visual: <MapMiniVisual />,
  },
  {
    icon: 'cycle',
    sub: 'Pomodoro System',
    title: '30분 집중, 5분 휴식',
    body: '포모도로 기법으로 설계됐어요. 집중과 휴식의 리듬이 지속 가능한 몰입을 만들어요.',
    visual: <PomodoroMiniVisual />,
  },
  {
    icon: 'timer',
    sub: '30-min Auto Timer',
    title: '집중만 하면 돼요',
    body: '30분 뒤 알림이 와요. 시간 걱정 없이 몰입하세요.',
    visual: <TimerMiniVisual />,
  },
  {
    icon: 'water_drop',
    sub: 'Real-time Toast',
    title: '이웃이 물을 줬어요',
    body: '누군가 물을 주면 바로 알려드려요. 같이 성장 중이에요.',
    visual: <ToastMiniVisual />,
  },
  {
    icon: 'forest',
    sub: '9-Stage Evolution',
    title: '씨앗에서 세계수까지',
    body: '매일 집중하면 씨앗이 전설의 세계수가 돼요.',
    visual: <EvolutionMiniVisual />,
  },
  {
    icon: 'landscape',
    sub: 'Collective Heatmap',
    title: '동네가 함께 짙어져요',
    body: '이웃이 집중할수록 우리 동네 색이 짙어져요.',
    visual: <HeatmapMiniVisual />,
  },
] as const;

export function FeaturesSection() {
  return (
    <section id="features" className="bg-background">
      <div className="absolute inset-0 pixel-bg pointer-events-none" />

      <div className="absolute inset-0 flex flex-col justify-center px-6 py-16">
        <div className="container mx-auto max-w-5xl w-full flex flex-col gap-6">
          {/* Header row: label + tagline side by side */}
          <div className="flex items-start gap-6">
            <h2 className="font-mono text-xl tracking-tighter px-2 py-1 border-2 border-outline bg-background/90 text-primary shrink-0">
              WHY PIXELFOREST
            </h2>
            <div>
              <p className="font-mono text-3xl text-on-surface leading-snug tracking-tighter">
                혼자라면 포기했을 집중,
              </p>
              <p className="font-mono text-3xl text-primary leading-snug tracking-tighter">
                같이라서 계속할 수 있어요.
              </p>
            </div>
          </div>

          {/* Feature cards — 3+3 grid */}
          <div className="grid grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <FeatureCard key={f.sub} feature={f} />
            ))}
          </div>
        </div>
      </div>

      {/* Swipe hint */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30 pointer-events-none">
        <span className="font-mono text-s text-primary opacity-50">
          swipe or use arrow keys ↓
        </span>
      </div>
    </section>
  );
}
