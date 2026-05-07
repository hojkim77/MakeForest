'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMapStore, useTimerStore } from '@/store';
import { regionDisplayName } from '@makeforest/types';
import { Icon } from '@/components/ui/Icon';
import { LoginPrompt } from './LoginPrompt';
import { SloganSection } from './SloganSection';
import { CreatureSection } from './CreatureSection';
import { TimerWaterSection } from './TimerWaterSection';
import { TaskList } from './TaskList';
import { NeighborhoodStats } from './NeighborhoodStats';
import { WaterToast } from './WaterToast';
import { usePushNotification } from '@/hooks/usePushNotification';

const WATER_THRESHOLD_SEC = 30 * 60;
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

type CreatureStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export function Panel() {
  const { data: session, status } = useSession();
  const { focusedRegionCode, focusRegion } = useMapStore();
  const { status: timerStatus, elapsedSec, autoPaused, todos, addTodo, toggleTodo, start, pause } = useTimerStore();
  const isLoggedIn = status === 'authenticated' && !!session?.user?.id;
  const myRegionCode = session?.user?.regionCode ?? null;
  const isPeeking = focusedRegionCode !== null && focusedRegionCode !== myRegionCode;
  const activeRegionCode = focusedRegionCode ?? myRegionCode;
  const neighborhoodName = activeRegionCode ? regionDisplayName(activeRegionCode) : '내 동네';

  const { subscribe } = usePushNotification();

  useEffect(() => {
    if (!isLoggedIn) return;
    subscribe().catch(() => {});
  }, [isLoggedIn]);

  const [creatureStage, setCreatureStage] = useState<CreatureStage>(0);
  const [myWaterCount, setMyWaterCount] = useState(0);
  const [growthPercent, setGrowthPercent] = useState(0);
  const [isWatering, setIsWatering] = useState(false);

  const fetchMyWaterCount = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch('/api/water/me');
      if (!res.ok) return;
      const data = await res.json() as { waterCount: number; creatureStage: number; creatureWaterCount: number };
      setMyWaterCount(data.waterCount);
      setCreatureStage(Math.min(data.creatureStage, 9) as CreatureStage);
      // growthPercent = 오늘 하루 물주기 진행도 (일일 12회 기준)
      setGrowthPercent(Math.min(Math.round((data.waterCount / 12) * 100), 100));
    } catch { /* 실패 시 기본값 유지 */ }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchMyWaterCount();
  }, [fetchMyWaterCount]);

  const sseRef = useRef<EventSource | null>(null);
  useEffect(() => {
    if (!activeRegionCode) return;
    if (sseRef.current) sseRef.current.close();

    const es = new EventSource(`${SERVER_URL}/sse/${encodeURIComponent(activeRegionCode)}`);
    sseRef.current = es;

    return () => { es.close(); sseRef.current = null; };
  }, [activeRegionCode]);

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

  async function handleStop() {
    pause();
    const { sessionId } = useTimerStore.getState();
    if (!sessionId) return;
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });
    } catch { /* 실패 시 조용히 무시 */ }
  }

  async function handleResume() {
    const { sessionId } = useTimerStore.getState();
    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resume' }),
        });
      } catch { /* 실패 시 조용히 무시 */ }
    }
    start();
  }

  async function handleWater() {
    if (isWatering) return;
    setIsWatering(true);
    const totalElapsedSec = myWaterCount * 1800 + elapsedSec;
    try {
      const res = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalElapsedSec }),
      });
      if (!res.ok) return;
      const data = await res.json() as { myWaterCount: number; userCreature: { stage: number; waterCount: number } };
      setMyWaterCount(data.myWaterCount);
      setCreatureStage(Math.min(data.userCreature.stage, 9) as CreatureStage);
      // growthPercent = 오늘 하루 물주기 진행도 (일일 12회 기준)
      setGrowthPercent(Math.min(Math.round((data.myWaterCount / 12) * 100), 100));
      useTimerStore.getState().resetWaterProgress();
    } catch { /* 실패 시 조용히 무시 */ }
    finally { setIsWatering(false); }
  }

  // function handleDongSelect(dongCode: string, dongName: string) {
  //   focusRegion(regionOf(dongCode, dongName));
  // }

  // 자동 정지(autoPaused) 상태에서도 물주기 허용 — 물을 줘야 재개 가능
  const canWater =
    isLoggedIn &&
    !isPeeking &&
    !isWatering &&
    (timerStatus === 'RUNNING' || (timerStatus === 'PAUSED' && autoPaused)) &&
    elapsedSec >= WATER_THRESHOLD_SEC;

  useEffect(() => {
    if (!autoPaused || !isLoggedIn) return;
    const { sessionId } = useTimerStore.getState();
    if (sessionId) {
      fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      }).catch(() => { });
    }
    fetch('/api/push/notify', { method: 'POST' }).catch(() => { });
  }, [autoPaused, isLoggedIn]);

  return (
    <aside className="w-[420px] flex-shrink-0 bg-surface-container border-r border-outline-variant flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col gap-xl p-lg flex-1">

        {isPeeking && (
          <button
            onClick={() => focusRegion(null)}
            className="flex items-center gap-sm p-sm bg-primary-fixed text-on-primary-fixed font-mono text-label uppercase tracking-wider w-full border border-primary active:translate-y-px transition-none"
          >
            <Icon name="arrow_back" size={16} />
            내 동네로 돌아가기
          </button>
        )}

        <SloganSection neighborhoodName={neighborhoodName} />
        <WaterToast regionCode={activeRegionCode} />

        {isLoggedIn && <CreatureSection stage={Math.min(creatureStage, 4) as 0 | 1 | 2 | 3 | 4} />}

        {isLoggedIn && (
          <NeighborhoodStats
            neighborhoodName={neighborhoodName}
            growthPercent={growthPercent}
          />
        )}

        {isLoggedIn ? (
          <>
            {!isPeeking && (
              <TimerWaterSection
                status={timerStatus}
                elapsedSec={elapsedSec}
                myWaterCount={myWaterCount}
                canWater={canWater}
                autoPaused={autoPaused}
                onStart={handleStart}
                onStop={handleStop}
                onResume={handleResume}
                onWater={handleWater}
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

        {/* TODO
          <div className="mt-auto pt-md border-t border-outline-variant">
            <NeighborhoodSearch onSelect={handleDongSelect} />
          </div> 
        */}

      </div>
    </aside>
  );
}
