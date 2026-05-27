'use client';

import { usePanelStore } from '@/shared/store';
import { DailyCollectionCard, type CollectionData } from './DailyCollectionCard';
import { TabButton } from './TabButton';

interface Props {
  dongCode: string | null;
  regionCode: string | null;
  initialCollection: CollectionData | null;
}

export function CollectionTab({ dongCode, regionCode, initialCollection }: Props) {
  const activeTab = usePanelStore((s) => s.activeTab);
  const toggleTab = usePanelStore((s) => s.toggleTab);

  return (
    <div className="relative">
      <TabButton label="공통 미션" active={activeTab === 'collection'} onClick={() => toggleTab('collection')} />
      {/* DailyCollectionCard는 SSE 연결 유지를 위해 항상 마운트 */}
      <div
        hidden={activeTab !== 'collection'}
        className="absolute top-0 w-64
                   right-7 md:left-7 md:right-auto
                   max-h-[calc(100dvh-var(--topbar-h)-var(--safe-top)-var(--tabbar-h)-var(--safe-bottom)-4rem)]
                   md:max-h-[calc(100dvh-var(--topbar-h)-var(--safe-top)-4rem)]
                   bg-surface-container border border-outline-variant overflow-y-auto"
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
  );
}
