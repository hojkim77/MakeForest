import { auth } from '@/auth';
import { TopAppBar } from '@/shared/components/ui/TopAppBar';
import { API_PATHS } from '@/shared/lib/apiPaths';
import type { CommunityFeedResponse, RegionRankingResponse } from '@/shared/lib/communityTypes';
import { CommunityFeedSection } from '../_components/community/CommunityFeedSection';
import { RankingSidebar } from '../_components/community/RankingSidebar';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

export default async function CommunityPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const userId = session?.user?.id;

  const feedParams = new URLSearchParams({ limit: '20' });
  if (userId) feedParams.set('userId', userId);

  const [feedData, rankingData] = await Promise.all([
    fetch(`${SERVER_URL}${API_PATHS.SERVER_COMMUNITY_FEED(feedParams.toString()).replace(`${SERVER_URL}`, '')}`)
      .then((r) => r.json() as Promise<CommunityFeedResponse>)
      .catch(() => ({ items: [], nextCursor: null } satisfies CommunityFeedResponse)),
    fetch(API_PATHS.SERVER_RANKING_REGION('today'))
      .then((r) => r.json() as Promise<RegionRankingResponse>)
      .catch(() => ({ period: 'today', rankings: [] } satisfies RegionRankingResponse)),
  ]);

  return (
    <>
      <TopAppBar />
      <main className="pt-[49px] min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-lg py-xl flex gap-xl items-start">
          <div className="flex-1 min-w-0">
            <CommunityFeedSection initialFeed={feedData} isLoggedIn={isLoggedIn} currentUserId={userId} />
          </div>
          <div className="w-64 flex-shrink-0">
            <RankingSidebar initialRanking={rankingData} />
          </div>
        </div>
      </main>
    </>
  );
}
