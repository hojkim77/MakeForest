import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import type { UserMeResType, FocusStatsResType, RankStatsResType, WeeklyStatsResType } from '@makeforest/types';
import { TopAppBar } from '@/shared/components/ui/TopAppBar';
import { ProfileHeader, ProfileHeaderSkeleton } from './_components/ProfileHeader';
import { StatsGrid, StatsGridSkeleton } from './_components/StatsGrid';
import { WeeklyChartSection, WeeklyChartSkeleton } from './_components/WeeklyChartSection';
import { MyCreature, MyCreatureSkeleton } from './_components/MyCreature';

export default async function MypagePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id: userId, dongCode } = session.user;

  const rankParams = new URLSearchParams({ userId });
  if (dongCode) rankParams.set('dongCode', dongCode);

  const [userMe, focus, rank, weekly] = await Promise.all([
    api.get<UserMeResType>(API_PATHS.SERVER_USER_ME(userId)),
    api.get<FocusStatsResType>(API_PATHS.SERVER_STATS_FOCUS(userId)),
    api.get<RankStatsResType>(API_PATHS.SERVER_STATS_RANK(rankParams.toString())),
    api.get<WeeklyStatsResType>(API_PATHS.SERVER_STATS_WEEKLY(userId)),
  ]);

  return (
    <>
      <TopAppBar />
      <main className="pt-topbar">
        <div className="max-w-[1000px] mx-auto py-4 px-4 md:py-8 md:px-6 space-y-6">
          <Suspense fallback={<ProfileHeaderSkeleton />}>
            <ProfileHeader userId={userId} initialData={userMe} />
          </Suspense>

          <Suspense fallback={<StatsGridSkeleton />}>
            <StatsGrid userId={userId} dongCode={dongCode ?? undefined} initialFocus={focus} initialRank={rank} />
          </Suspense>

          <Suspense fallback={<WeeklyChartSkeleton />}>
            <WeeklyChartSection userId={userId} initialData={weekly} />
          </Suspense>

          <Suspense fallback={<MyCreatureSkeleton />}>
            <MyCreature userId={userId} initialData={userMe} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
