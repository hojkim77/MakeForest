'use client';

import { useMapStore } from '@/store';
import { useTimerStore } from '@/store';
import { Icon } from '@/components/ui/Icon';
import { SloganSection } from './SloganSection';
import { CreatureSection } from './CreatureSection';
import { TimerSection } from './TimerSection';
import { TaskList } from './TaskList';
import { NeighborhoodStats } from './NeighborhoodStats';
import { NeighborhoodSearch } from './NeighborhoodSearch';

// ------- Mock constants (replace with real data from API / SSE) --------
const MY_DONG_CODE = 'mock-my-dong';
const MY_DONG_NAME = '망원동';
const WATER_THRESHOLD_SEC = 2 * 60 * 60; // 2 hours per water
// -----------------------------------------------------------------------

export function Panel() {
  const { focusedDongCode, focusDong } = useMapStore();
  const { status, elapsedSec, todos, addTodo, toggleTodo, setStatus } = useTimerStore();

  const isPeeking = focusedDongCode !== null && focusedDongCode !== MY_DONG_CODE;

  // TODO: derive from server session / user store
  const neighborhoodName = isPeeking ? '연남동' : MY_DONG_NAME;
  const waterCount = 1;       // replace with real water count from server
  const growthPercent = 74;   // replace with real neighborhood XP %
  const creatureStage = 1 as 0 | 1 | 2 | 3;  // replace with server-derived stage

  function handleStart() { setStatus('RUNNING'); }
  function handleStop() { setStatus('PAUSED'); }
  function handleWater() { /* TODO: call POST /water API */ }
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
          canWater={!isPeeking && status === 'RUNNING'}
          onWater={handleWater}
        />

        {/* ── Timer (내 동네 모드만) ── */}
        {!isPeeking && (
          <TimerSection
            status={status}
            elapsedSec={elapsedSec}
            thresholdSec={WATER_THRESHOLD_SEC}
            onStart={handleStart}
            onStop={handleStop}
          />
        )}

        {/* ── Task list (내 동네 모드만) ── */}
        {!isPeeking && (
          <TaskList
            todos={todos}
            onToggle={toggleTodo}
            onAdd={addTodo}
          />
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
