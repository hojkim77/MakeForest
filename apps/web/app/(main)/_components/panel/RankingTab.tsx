'use client';

import { usePanelStore } from '@/shared/store';
import { RegionalRankingCard } from './RegionalRankingCard';
import type { RegionRankingResponse } from '@makeforest/types';
import { TabButton } from './TabButton';

interface Props {
  myRegionKey: string | null;
  initialRanking: RegionRankingResponse;
}

export function RankingTab({ myRegionKey, initialRanking }: Props) {
  const activeTab = usePanelStore((s) => s.activeTab);
  const toggleTab = usePanelStore((s) => s.toggleTab);

  return (
    <div className="relative mt-xs">
      <TabButton label="지역 랭킹" active={activeTab === 'ranking'} onClick={() => toggleTab('ranking')} />
      {activeTab === 'ranking' && (
        <div
          className="absolute top-0 w-64
                     right-7 md:left-7 md:right-auto
                     max-h-[calc(100dvh-var(--topbar-h)-var(--safe-top)-var(--tabbar-h)-var(--safe-bottom)-4rem)]
                     md:max-h-[calc(100dvh-var(--topbar-h)-var(--safe-top)-4rem)]
                     bg-surface-container border border-outline-variant overflow-y-auto"
        >
          <div className="p-md">
            <RegionalRankingCard myRegionKey={myRegionKey} initialRanking={initialRanking} />
          </div>
        </div>
      )}
    </div>
  );
}
