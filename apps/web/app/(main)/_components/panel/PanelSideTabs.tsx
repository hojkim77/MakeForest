import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import type { CollectionData } from './DailyCollectionCard';
import type { RegionRankingResponse } from '@makeforest/types';
import { CollectionTab } from './CollectionTab';
import { RankingTab } from './RankingTab';
import { TodoTab } from './TodoTab';

interface Props {
  myDongCode: string | null;
  myRegionCode: string | null;
  isLoggedIn: boolean;
}

export async function PanelSideTabs({ myDongCode, myRegionCode, isLoggedIn }: Props) {
  const [initialCollection, rankingData] = await Promise.all([
    myRegionCode
      ? api.get<CollectionData>(API_PATHS.SERVER_COLLECTION_TODAY(myRegionCode)).catch(() => null)
      : Promise.resolve(null),
    api
      .get<RegionRankingResponse>(API_PATHS.SERVER_RANKING_REGION('today', myDongCode ?? undefined))
      .catch(() => ({ period: 'today' as const, rankings: [], myRegionKey: null })),
  ]);

  return (
    <div
      className="fixed top-[49px] h-[calc(100vh-49px)] flex flex-col pt-lg pb-lg z-30"
      style={{ left: 420 }}
    >
      <CollectionTab
        dongCode={myDongCode}
        regionCode={myRegionCode}
        initialCollection={initialCollection}
      />
      <RankingTab
        myRegionKey={rankingData.myRegionKey ?? null}
        initialRanking={rankingData}
      />
      {isLoggedIn && <TodoTab />}
    </div>
  );
}
