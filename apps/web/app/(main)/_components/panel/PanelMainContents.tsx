import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { getKstDateString } from '@/shared/utils/date';
import type { WaterQueryData } from '@/shared/hooks/queries/useWaterQuery';
import type { TodaySession } from '@makeforest/types';
import { CreatureSection } from './CreatureSection';
import { TimerWaterSection } from './TimerWaterSection';
import { NeighborhoodStats } from './NeighborhoodStats';
import { LoginPrompt } from './LoginPrompt';

interface Props {
  myRegionCode: string | null;
  userId: string | null;
  isLoggedIn: boolean;
}

export async function PanelMainContents({ myRegionCode, userId, isLoggedIn }: Props) {
  let initialWater: WaterQueryData = { waterCount: 0, creatureStage: 0, totalWaterCount: 0, growthPercent: 0 };
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
      growthPercent: 0,
    };
    todaySession = sessionData;
  }

  return (
    <>
      {isLoggedIn && <CreatureSection userId={userId} initialWater={initialWater} />}
      {isLoggedIn && <NeighborhoodStats userId={userId} initialWater={initialWater} />}
      {isLoggedIn ? (
        <TimerWaterSection myRegionCode={myRegionCode} userId={userId} initialWater={initialWater} initialSession={todaySession} />
      ) : (
        <LoginPrompt />
      )}
    </>
  );
}
