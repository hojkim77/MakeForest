'use client';

import { usePanelStore } from '@/shared/store';
import type { CollectionProgress } from '@makeforest/types';
import { DailyCollectionCard } from './DailyCollectionCard';
import { TabButton } from './TabButton';
import { TabPopup } from './TabPopup';

interface Props {
  dongCode: string | null;
  regionCode: string | null;
  initialCollection: CollectionProgress | null;
}

export function CollectionTab({ dongCode, regionCode, initialCollection }: Props) {
  const activeTab = usePanelStore((s) => s.activeTab);
  const toggleTab = usePanelStore((s) => s.toggleTab);

  return (
    <div className="relative">
      <TabButton label="공통 미션" active={activeTab === 'collection'} onClick={() => toggleTab('collection')} />
      {/* DailyCollectionCard는 SSE 연결 유지를 위해 항상 마운트 */}
      <TabPopup>
        <div hidden={activeTab !== 'collection'} className="p-md">
          <DailyCollectionCard
            dongCode={dongCode}
            regionCode={regionCode}
            initialCollection={initialCollection}
          />
        </div>
      </TabPopup>
    </div>
  );
}
