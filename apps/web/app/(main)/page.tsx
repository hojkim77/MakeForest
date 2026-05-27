import { TopAppBar } from '@/shared/components/ui/TopAppBar';
import { MobileTabBar } from '@/shared/components/ui/MobileTabBar';
import { MainLayout } from '@/shared/components/ui/MainLayout';
import { Panel } from '@/app/(main)/_components/panel/Panel';
import { MapContainer } from '@/app/(main)/_components/map/MapContainer';
import { MapOverlay } from '@/app/(main)/_components/map/MapOverlay';
import { GuideController } from '@/app/(main)/_components/guide/GuideController';
import { MainSseHandler } from '@/app/(main)/_components/MainSseHandler';
import { auth } from '@/auth';

export default async function MainPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <>
      <MainSseHandler />
      <TopAppBar />
      <MobileTabBar />
      <MainLayout
        panel={<Panel />}
        map={
          <>
            <MapContainer />
            <MapOverlay />
          </>
        }
      />
      {isLoggedIn && <GuideController />}
    </>
  );
}
