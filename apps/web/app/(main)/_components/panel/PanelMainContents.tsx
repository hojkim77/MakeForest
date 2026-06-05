import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { getKstDateString } from '@/shared/utils/date';
import type { WaterQueryData } from '@/shared/hooks/queries/useWaterQuery';
import type { TodayStateResType } from '@makeforest/types';
import { CreatureSection } from './CreatureSection';
import { NeighborhoodStats } from './NeighborhoodStats';
import { TimerSection } from './TimerSection';
import { LoginPrompt } from './LoginPrompt';

interface Props {
  myRegionCode: string | null;
  userId: string | null;
  isLoggedIn: boolean;
}

export async function PanelMainContents({ myRegionCode, userId, isLoggedIn }: Props) {
  let initialWater: WaterQueryData = { waterCount: 0, creatureStage: 0, totalWaterCount: 0, growthPercent: 0 };
  let initialTodayState: TodayStateResType | null = null;

  if (isLoggedIn && userId) {
    const today = getKstDateString();
    const [waterData, userData, todayStateData] = await Promise.all([
      api.get<{ waterCount: number }>(API_PATHS.SERVER_WATER_ME(userId, today)),
      api.get<{ userCreature: { stage: number; totalWaterCount: number } | null }>(API_PATHS.SERVER_USER_ME(userId)),
      api.get<TodayStateResType>(API_PATHS.SERVER_SESSION_TODAY(userId)).catch(() => null),
    ]);
    initialWater = {
      waterCount: waterData.waterCount ?? 0,
      creatureStage: userData.userCreature?.stage ?? 0,
      totalWaterCount: userData.userCreature?.totalWaterCount ?? 0,
      growthPercent: 0,
    };
    initialTodayState = todayStateData;
  }

  return (
    <>
      {isLoggedIn ? (
        <>
          <CreatureSection userId={userId} initialWater={initialWater} />
          <NeighborhoodStats userId={userId} initialWater={initialWater} />
          <TimerSection
            myRegionCode={myRegionCode}
            userId={userId}
            initialTodayState={initialTodayState}
          />
        </>
      ) : (
        <LoginPrompt />
      )}
    </>
  );
}
