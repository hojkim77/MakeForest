import { TopAppBar } from '@/shared/components/ui/TopAppBar';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { api } from '@/shared/lib/api';
import type { CommunityFeedResponse, RegionRankingResponse } from '@makeforest/types';
import { CommunityFeedSection } from './_components/CommunityFeedSection';
import { RankingSidebar } from './_components/RankingSidebar';

const DEFAULT_PERIOD = 'all';
const DEFAULT_SORT = 'recent';
const DEFAULT_REGION_KEY = '';

export default async function CommunityPage() {
  const feedParams = new URLSearchParams({ limit: '20', period: DEFAULT_PERIOD, sort: DEFAULT_SORT });

  const [rankingData, initialFeed] = await Promise.all([
    api
      .get<RegionRankingResponse>(API_PATHS.SERVER_RANKING_REGION('today'), { next: { revalidate: 3600 } })
      .catch(() => ({ period: 'today', rankings: [] } satisfies RegionRankingResponse)),
    api
      .get<CommunityFeedResponse>(
        `${API_PATHS.SERVER_COMMUNITY_FEED(feedParams.toString())}`,
        { next: { tags: ['community-feed', `community-feed-${DEFAULT_PERIOD}-${DEFAULT_SORT}-${DEFAULT_REGION_KEY}`], revalidate: 60 } },
      )
      .catch(() => ({ items: [], nextCursor: null } satisfies CommunityFeedResponse)),
  ]);

  const fetchedAt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

  return (
    <>
      <TopAppBar />
      <main className="pt-topbar min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-lg py-xl flex flex-col md:flex-row gap-xl items-start">
          <div className="flex-1 min-w-0 w-full">
            <CommunityFeedSection initialFeed={initialFeed} />
          </div>
          <div className="hidden md:block md:w-64 md:flex-shrink-0">
            <RankingSidebar initialRanking={rankingData} fetchedAt={fetchedAt} />
          </div>
        </div>
      </main>
    </>
  );
}
