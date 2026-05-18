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
        className="absolute left-7 top-0 w-64 max-h-[calc(100vh-49px-4rem)] bg-surface-container border border-outline-variant overflow-y-auto"
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
