import { TopAppBar } from '@/shared/components/ui/TopAppBar';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { api } from '@/shared/lib/api';
import type { RegionRankingResponse } from '@makeforest/types';
import { CommunityFeedSection } from './_components/CommunityFeedSection';
import { RankingSidebar } from './_components/RankingSidebar';

export default async function CommunityPage() {
  const rankingData = await api
    .get<RegionRankingResponse>(API_PATHS.SERVER_RANKING_REGION('today'), { next: { revalidate: 3600 } })
    .catch(() => ({ period: 'today', rankings: [] } satisfies RegionRankingResponse));

  const fetchedAt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

  return (
    <>
      <TopAppBar />
      <main className="pt-[49px] min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-lg py-xl flex gap-xl items-start">
          <div className="flex-1 min-w-0">
            <CommunityFeedSection />
          </div>
          <div className="w-64 flex-shrink-0">
            <RankingSidebar initialRanking={rankingData} fetchedAt={fetchedAt} />
          </div>
        </div>
      </main>
    </>
  );
}
