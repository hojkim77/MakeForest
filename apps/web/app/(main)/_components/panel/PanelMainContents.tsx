import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { WaterStoreInitializer } from './WaterStoreInitializer';
import { SessionStoreInitializer } from './SessionStoreInitializer';
import type { TodaySession } from './SessionStoreInitializer';
import { CreatureSection } from './CreatureSection';
import { TimerWaterSection } from './TimerWaterSection';
import { NeighborhoodStats } from './NeighborhoodStats';
import { LoginPrompt } from './LoginPrompt';
import { getKstDateString } from '@/shared/utils/date';

interface Props {
  userId: string | null;
  isLoggedIn: boolean;
  myRegionCode: string | null;
}

export async function PanelMainContents({ userId, isLoggedIn, myRegionCode }: Props) {
  let initialWater = { waterCount: 0, creatureStage: 0, totalWaterCount: 0 };
  let todaySession: TodaySession | null = null;

  if (isLoggedIn && userId) {
    const today = getKstDateString();
    const [waterData, userData, sessionData] = await Promise.all([
      api.get<{ waterCount: number }>(API_PATHS.SERVER_WATER_ME(userId, today)),
      api.get<{ userCreature: { stage: number; totalWaterCount: number } | null }>(API_PATHS.SERVER_USER_ME(userId)),
      api.get<TodaySession>(API_PATHS.SERVER_SESSION_TODAY(userId)).catch(() => null),
    ]);

    initialWater = {
      waterCount: waterData.waterCount ?? 0,
      creatureStage: userData.userCreature?.stage ?? 0,
      totalWaterCount: userData.userCreature?.totalWaterCount ?? 0,
    };
    todaySession = sessionData;
  }

  return (
    <>
      <WaterStoreInitializer {...initialWater} />
      <SessionStoreInitializer session={todaySession} />
      {isLoggedIn && <CreatureSection />}
      {isLoggedIn && <NeighborhoodStats />}
      {isLoggedIn ? (
        <TimerWaterSection myRegionCode={myRegionCode} />
      ) : (
        <LoginPrompt />
      )}
    </>
  );
}
