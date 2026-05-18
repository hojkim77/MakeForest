'use client';

import { usePanelStore, useTodoStore, selectIsDirty } from '@/shared/store';
import { DailyCollectionCard, type CollectionData } from './DailyCollectionCard';
import { RegionalRankingCard } from './RegionalRankingCard';
import { TodoCardContent } from './TodoCard';
import type { RegionRankingResponse } from '@/shared/lib/communityTypes';

interface Props {
  dongCode: string | null;
  regionCode: string | null;
  initialCollection: CollectionData | null;
  myRegionKey: string | null;
  initialRanking: RegionRankingResponse;
  isLoggedIn: boolean;
}

export function PanelSideTabs({ dongCode, regionCode, initialCollection, myRegionKey, initialRanking, isLoggedIn }: Props) {
  const activeTab = usePanelStore((s) => s.activeTab);
  const toggleTab = usePanelStore((s) => s.toggleTab);
  const todoOpen = useTodoStore((s) => s.open);
  const setTodoOpen = useTodoStore((s) => s.setOpen);
  const isTodoDirty = useTodoStore(selectIsDirty);
  const todoCount = useTodoStore((s) => s.todos.length);

  return (
    <div
      className="fixed top-[49px] h-[calc(100vh-49px)] flex flex-col pt-lg pb-lg z-30"
      style={{ left: 420 }}
    >
      {/* 공통 미션 탭 */}
      <div className="relative">
        <TabButton label="공통 미션" active={activeTab === 'collection'} onClick={() => toggleTab('collection')} />
        {/* DailyCollectionCard는 SSE 연결 유지를 위해 항상 마운트 */}
        <div
          className={`absolute left-7 top-0 w-64 max-h-[calc(100vh-49px-4rem)] bg-surface-container border border-outline-variant overflow-y-auto ${activeTab === 'collection' ? '' : 'hidden'}`}
        >
          <div className="p-md">
            <DailyCollectionCard
              dongCode={dongCode}
              regionCode={regionCode}
              initialCollection={initialCollection}
            />
          </div>
        </div>
      </div>

      {/* 지역 랭킹 탭 */}
      <div className="relative mt-xs">
        <TabButton label="지역 랭킹" active={activeTab === 'ranking'} onClick={() => toggleTab('ranking')} />
        {activeTab === 'ranking' && (
          <div className="absolute left-7 top-0 w-64 max-h-[calc(100vh-49px-4rem)] bg-surface-container border border-outline-variant overflow-y-auto">
            <div className="p-md">
              <RegionalRankingCard myRegionKey={myRegionKey} initialRanking={initialRanking} />
            </div>
          </div>
        )}
      </div>

      {/* 할일 탭 — 하단 */}
      {isLoggedIn && (
        <div className="relative mt-auto">
          <TabButton
            label="오늘 할일"
            active={todoOpen}
            onClick={() => setTodoOpen(!todoOpen)}
            {...(isTodoDirty ? { badge: '●' } : todoCount > 0 ? { badge: String(todoCount) } : {})}
          />
          {todoOpen && (
            <div className="absolute left-7 bottom-0 w-64 bg-surface-container border border-outline-variant overflow-hidden">
              <TodoCardContent />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`
        relative w-7 px-1 py-md
        border border-outline-variant
        font-mono text-label
        flex items-center justify-center
        transition-colors
        ${active
          ? 'bg-primary text-on-primary border-primary'
          : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'
        }
      `}
      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
    >
      {label}
      {badge && (
        <span
          className="absolute top-1 right-0.5 font-mono text-[8px] leading-none text-primary"
          style={{ writingMode: 'horizontal-tb' }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
