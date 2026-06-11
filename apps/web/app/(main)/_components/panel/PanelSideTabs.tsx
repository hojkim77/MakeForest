import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import type { MissionProgress, RegionRankingResponse } from '@makeforest/types';
import { MissionTab } from './MissionTab';
import { RankingTab } from './RankingTab';
import { TodoTab } from './TodoTab';

interface Props {
  myDongCode: string | null;
  myRegionCode: string | null;
  isLoggedIn: boolean;
}

export async function PanelSideTabs({ myDongCode, myRegionCode, isLoggedIn }: Props) {
  const [initialMission, rankingData] = await Promise.all([
    myRegionCode
      ? api.get<MissionProgress>(API_PATHS.SERVER_MISSION_TODAY(myRegionCode)).catch(() => null)
      : Promise.resolve(null),
    api
      .get<RegionRankingResponse>(API_PATHS.SERVER_RANKING_REGION('today', myDongCode ?? undefined), { next: { revalidate: 300 } })
      .catch(() => ({ period: 'today' as const, rankings: [], myRegionKey: null })),
  ]);

  return (
    <div
      className={[
        'flex flex-col fixed z-side-tabs pt-lg pb-lg',
        'right-0 left-auto',
        'h-[calc(100dvh-var(--topbar-h)-var(--safe-top)-var(--tabbar-h)-var(--safe-bottom))]',
        'md:right-auto md:left-[var(--panel-w)]',
        'md:h-[calc(100dvh-var(--topbar-h)-var(--safe-top))]',
      ].join(' ')}
      style={{ top: 'calc(var(--topbar-h) + var(--safe-top))' }}
    >
      <MissionTab
        dongCode={myDongCode}
        regionCode={myRegionCode}
        initialMission={initialMission}
      />
      <RankingTab
        myRegionKey={rankingData.myRegionKey ?? null}
        initialRanking={rankingData}
      />
      {isLoggedIn && <TodoTab />}
    </div>
  );
}
