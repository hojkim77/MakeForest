'use client';

import { usePanelStore } from '@/shared/store';
import type { MissionProgress } from '@makeforest/types';
import { DailyMissionCard } from './DailyMissionCard';
import { TabButton } from './TabButton';
import { TabPopup } from './TabPopup';

interface Props {
  dongCode: string | null;
  regionCode: string | null;
  initialMission: MissionProgress | null;
}

export function MissionTab({ dongCode, regionCode, initialMission }: Props) {
  const activeTab = usePanelStore((s) => s.activeTab);
  const toggleTab = usePanelStore((s) => s.toggleTab);

  return (
    <div className="relative">
      <TabButton label="공통 미션" active={activeTab === 'mission'} onClick={() => toggleTab('mission')} />
      {/* DailyMissionCard는 SSE 연결 유지를 위해 항상 마운트 */}
      {activeTab === 'mission' && <TabPopup>
        <div className="p-md">
          <DailyMissionCard
            dongCode={dongCode}
            regionCode={regionCode}
            initialMission={initialMission}
          />
        </div>
      </TabPopup>}
    </div >
  );
}
