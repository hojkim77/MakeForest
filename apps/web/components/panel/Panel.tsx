'use client';

import { useSession } from 'next-auth/react';
import { useMapStore, useTimerStore } from '@/store';
import { Icon } from '@/components/ui/Icon';
import { LoginPrompt } from './LoginPrompt';
import { SloganSection } from './SloganSection';
import { CreatureSection } from './CreatureSection';
import { TimerSection } from './TimerSection';
import { TaskList } from './TaskList';
import { NeighborhoodStats } from './NeighborhoodStats';
import { NeighborhoodSearch } from './NeighborhoodSearch';

const WATER_THRESHOLD_SEC = 2 * 60 * 60;

export function Panel() {
  const { data: session, status } = useSession();
  const { focusedDongCode, focusDong } = useMapStore();
  const { status: timerStatus, elapsedSec, todos, addTodo, toggleTodo, setStatus } = useTimerStore();

  const isLoggedIn = status === 'authenticated' && !!session?.user?.id;
  const myDongCode = session?.user?.dongCode ?? null;
  const isPeeking = focusedDongCode !== null && focusedDongCode !== myDongCode;

  // TODO: replace mock values with server/SSE data
  const neighborhoodName = isPeeking ? '연남동' : (myDongCode ?? '내 동네');
  const waterCount = 1;
  const growthPercent = 74;
  const creatureStage = 1 as 0 | 1 | 2 | 3;

  function handleStart() { setStatus('RUNNING'); }
  function handleStop() { setStatus('PAUSED'); }
  function handleWater() { /* TODO: POST /water */ }
  function handleDongSelect(dongCode: string) { focusDong(dongCode); }

  return (
    <aside className="w-[420px] flex-shrink-0 bg-surface-container border-r border-outline-variant flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col gap-xl p-lg flex-1">

        {/* ── Peek mode banner ── */}
        {isPeeking && (
          <button
            onClick={() => focusDong(null)}
            className="flex items-center gap-sm p-sm bg-primary-fixed text-on-primary-fixed font-mono text-label uppercase tracking-wider w-full border border-primary active:translate-y-px transition-none"
          >
            <Icon name="arrow_back" size={16} />
            내 동네로 돌아가기
          </button>
        )}

        {/* ── Slogan ── */}
        <SloganSection neighborhoodName={neighborhoodName} />

        {/* ── Creature + water ── */}
        <CreatureSection
          stage={creatureStage}
          waterCount={waterCount}
          canWater={isLoggedIn && !isPeeking && timerStatus === 'RUNNING'}
          onWater={handleWater}
        />

        {/* ── Auth gate: timer + tasks only for logged-in users ── */}
        {isLoggedIn ? (
          <>
            {!isPeeking && (
              <TimerSection
                status={timerStatus}
                elapsedSec={elapsedSec}
                thresholdSec={WATER_THRESHOLD_SEC}
                onStart={handleStart}
                onStop={handleStop}
              />
            )}

            {!isPeeking && (
              <TaskList
                todos={todos}
                onToggle={toggleTodo}
                onAdd={addTodo}
              />
            )}
          </>
        ) : (
          /* ── Login prompt in-panel (no popup) ── */
          !isPeeking && <LoginPrompt />
        )}

        {/* ── Neighborhood stats ── */}
        <NeighborhoodStats
          neighborhoodName={neighborhoodName}
          growthPercent={growthPercent}
        />

        {/* ── Spacer + search (bottom) ── */}
        <div className="mt-auto pt-md border-t border-outline-variant">
          <NeighborhoodSearch onSelect={handleDongSelect} />
        </div>

      </div>
    </aside>
  );
}
