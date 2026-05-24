import { TopAppBar } from '@/shared/components/ui/TopAppBar';
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

      {/* pt-[49px] = header height (py-sm * 2 + icon) */}
      <main className="pt-[49px] flex h-screen overflow-hidden">
        {/* Left panel: profile, creature, timer, todos */}
        <Panel />

        {/* Map area */}
        <section className="relative flex-1 bg-inverse-surface overflow-hidden">
          <MapContainer />
          <MapOverlay />
        </section>
      </main>

      {isLoggedIn && <GuideController />}
    </>
  );
}
