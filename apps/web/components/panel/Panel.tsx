'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { WaterToast } from './WaterToast';

const WATER_THRESHOLD_SEC = 2 * 60 * 60;
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

type CreatureStage = 0 | 1 | 2 | 3 | 4;

export function Panel() {
  const { data: session, status } = useSession();
  const { focusedDongCode, focusDong } = useMapStore();
  const { status: timerStatus, elapsedSec, todos, addTodo, toggleTodo, start, pause } = useTimerStore();

  const isLoggedIn = status === 'authenticated' && !!session?.user?.id;
  const myDongCode = session?.user?.dongCode ?? null;
  const isPeeking = focusedDongCode !== null && focusedDongCode !== myDongCode;
  const activeDongCode = focusedDongCode ?? myDongCode;

  const neighborhoodName = activeDongCode ?? '내 동네';

  // 생명체 & 물주기 상태
  const [creatureStage, setCreatureStage] = useState<CreatureStage>(0);
  const [myWaterCount, setMyWaterCount] = useState(0);
  const [growthPercent, setGrowthPercent] = useState(0);

  // 생명체 데이터 fetch
  const fetchCreature = useCallback(async (dongCode: string) => {
    try {
      const res = await fetch(`/api/creature/${dongCode}`);
      if (!res.ok) return;
      const data = await res.json() as { stage: number; waterCount: number };
      setCreatureStage(Math.min(data.stage, 4) as CreatureStage);
      // 동네 전체 물주기 수를 기반으로 경험치 바 계산 (45회 = 100%)
      setGrowthPercent(Math.min(Math.round((data.waterCount / 45) * 100), 100));
    } catch { /* 실패 시 기본값 유지 */ }
  }, []);

  // 내 물주기 횟수 fetch
  const fetchMyWaterCount = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch('/api/water/me');
      if (!res.ok) return;
      const data = await res.json() as { waterCount: number };
      setMyWaterCount(data.waterCount);
    } catch { /* 실패 시 기본값 유지 */ }
  }, [isLoggedIn]);

  // 동네 변경 or 최초 로드 시 데이터 fetch
  useEffect(() => {
    if (!activeDongCode) return;
    fetchCreature(activeDongCode);
  }, [activeDongCode, fetchCreature]);

  useEffect(() => {
    fetchMyWaterCount();
  }, [fetchMyWaterCount]);

  // SSE: creature:update 구독 (동네 생명체 실시간 반영)
  const sseRef = useRef<EventSource | null>(null);
  useEffect(() => {
    if (!activeDongCode) return;
    if (sseRef.current) sseRef.current.close();

    const es = new EventSource(`${SERVER_URL}/sse/${activeDongCode}`);
    sseRef.current = es;

    es.addEventListener('creature:update', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as { stage: number; waterCount: number };
      setCreatureStage(Math.min(data.stage, 4) as CreatureStage);
      setGrowthPercent(Math.min(Math.round((data.waterCount / 45) * 100), 100));
    });

    return () => { es.close(); sseRef.current = null; };
  }, [activeDongCode]);

  // 타이머 시작 — DB 세션 생성 후 로컬 타이머 시작
  async function handleStart() {
    if (!isLoggedIn) return;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationSec: 7200, todos }),
      });
      if (res.ok) {
        const data = await res.json() as { sessionId: string };
        useTimerStore.getState().setSession(data.sessionId);
      }
    } catch { /* 세션 생성 실패 시에도 로컬 타이머는 동작 */ }
    start();
  }

  // 타이머 중지 — DB 세션 complete 처리
  async function handleStop() {
    pause();
    const { sessionId } = useTimerStore.getState();
    if (!sessionId) return;
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
    } catch { /* 실패 시 조용히 무시 */ }
  }

  // 물주기
  async function handleWater() {
    try {
      const res = await fetch('/api/water', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json() as { myWaterCount: number; creature: { stage: number; waterCount: number } };
      setMyWaterCount(data.myWaterCount);
      setCreatureStage(Math.min(data.creature.stage, 4) as CreatureStage);
      setGrowthPercent(Math.min(Math.round((data.creature.waterCount / 45) * 100), 100));
      // 물주기 후 타이머 진행도 2시간 리셋
      useTimerStore.getState().resetWaterProgress();
    } catch { /* 실패 시 조용히 무시 */ }
  }

  function handleDongSelect(dongCode: string) { focusDong(dongCode); }

  // 물주기 버튼 활성화: 타이머 실행 중 + 2시간 이상 누적
  const canWater =
    isLoggedIn &&
    !isPeeking &&
    timerStatus === 'RUNNING' &&
    elapsedSec >= WATER_THRESHOLD_SEC;

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

        {/* ── Water toast (SSE) ── */}
        <WaterToast dongCode={activeDongCode} />

        {/* ── Creature + water ── */}
        <CreatureSection
          stage={creatureStage}
          waterCount={myWaterCount}
          canWater={canWater}
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
