import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { ProfileHeader, ProfileHeaderSkeleton } from './components/ProfileHeader';
import { StatsGrid, StatsGridSkeleton } from './components/StatsGrid';
import { WeeklyChartSection, WeeklyChartSkeleton } from './components/WeeklyChartSection';
import { MyCreature, MyCreatureSkeleton } from './components/MyCreature';

export default async function MypagePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id: userId, dongCode } = session.user;

  return (
    <>
      <TopAppBar />
      <main className="pt-[49px]">
      <div className="max-w-[1000px] mx-auto py-8 px-6 space-y-6">
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
