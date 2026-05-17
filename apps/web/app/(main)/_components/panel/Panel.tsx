import { auth } from '@/auth';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { WaterStoreInitializer } from './WaterStoreInitializer';
import { PeekingBanner } from './PeekingBanner';
import { SloganSection } from './SloganSection';
import { CreatureSection } from './CreatureSection';
import { TimerWaterSection } from './TimerWaterSection';
import { TaskList } from './TaskList';
import { NeighborhoodStats } from './NeighborhoodStats';
import { ActivityToastFeed } from './ActivityToastFeed';
import { PanelSideTabs } from './PanelSideTabs';
import { LoginPrompt } from './LoginPrompt';
import { getKstDateString } from '@/shared/utils/date';
import type { CollectionData } from './DailyCollectionCard';

export async function Panel() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const myRegionCode = session?.user?.regionCode ?? null;
  const myDongCode = session?.user?.dongCode ?? null;

  let initialWater = { waterCount: 0, creatureStage: 0, totalWaterCount: 0 };
  let initialCollection: CollectionData | null = null;

  if (isLoggedIn && session?.user?.id) {
    const today = getKstDateString();
    const [waterData, userData, collectionData] = await Promise.all([
      api.get<{ waterCount: number }>(API_PATHS.SERVER_WATER_ME(session.user.id, today)),
      api.get<{ userCreature: { stage: number; totalWaterCount: number } | null }>(API_PATHS.SERVER_USER_ME(session.user.id)),
      myRegionCode
        ? api.get<CollectionData>(API_PATHS.SERVER_COLLECTION_TODAY(myRegionCode)).catch(() => null)
        : Promise.resolve(null),
    ]);

    initialWater = {
      waterCount: waterData.waterCount ?? 0,
      creatureStage: userData.userCreature?.stage ?? 0,
      totalWaterCount: userData.userCreature?.totalWaterCount ?? 0,
    };
    initialCollection = collectionData;
  }

  return (
    <aside className="w-[420px] flex-shrink-0 bg-surface-container border-r border-outline-variant flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col gap-xl p-lg flex-1">
        <WaterStoreInitializer {...initialWater} />
        <PeekingBanner myRegionCode={myRegionCode} />
        <SloganSection myRegionCode={myRegionCode} />
        <ActivityToastFeed myRegionCode={myRegionCode} />

        {isLoggedIn && <CreatureSection />}
        {isLoggedIn && <NeighborhoodStats />}

        {isLoggedIn ? (
          <>
            <TimerWaterSection myRegionCode={myRegionCode} />
            <TaskList myRegionCode={myRegionCode} />
          </>
        ) : (
          <LoginPrompt />
        )}
      </div>

      <PanelSideTabs
        dongCode={myDongCode}
        regionCode={myRegionCode}
        initialCollection={initialCollection}
      />
    </aside>
  );
}
