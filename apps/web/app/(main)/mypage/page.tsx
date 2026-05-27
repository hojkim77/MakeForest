import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { TopAppBar } from '@/shared/components/ui/TopAppBar';
import { ProfileHeader, ProfileHeaderSkeleton } from './_components/ProfileHeader';
import { StatsGrid, StatsGridSkeleton } from './_components/StatsGrid';
import { WeeklyChartSection, WeeklyChartSkeleton } from './_components/WeeklyChartSection';
import { MyCreature, MyCreatureSkeleton } from './_components/MyCreature';

export default async function MypagePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id: userId, dongCode } = session.user;

  return (
    <>
      <TopAppBar />
      <main className="pt-topbar">
        <div className="max-w-[1000px] mx-auto py-4 px-4 md:py-8 md:px-6 space-y-6">
          <Suspense fallback={<ProfileHeaderSkeleton />}>
            <ProfileHeader userId={userId} />
          </Suspense>

          <Suspense fallback={<StatsGridSkeleton />}>
            <StatsGrid userId={userId} dongCode={dongCode} />
          </Suspense>

          <Suspense fallback={<WeeklyChartSkeleton />}>
            <WeeklyChartSection userId={userId} />
          </Suspense>

          <Suspense fallback={<MyCreatureSkeleton />}>
            <MyCreature userId={userId} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
