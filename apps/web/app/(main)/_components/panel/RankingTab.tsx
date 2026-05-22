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
        <div className="absolute left-7 top-0 w-64 max-h-[calc(100vh-49px-4rem)] bg-surface-container border border-outline-variant overflow-y-auto">
          <div className="p-md">
            <RegionalRankingCard myRegionKey={myRegionKey} initialRanking={initialRanking} />
          </div>
        </div>
      )}
    </div>
  );
}
