import { TopAppBar } from '@/shared/components/ui/TopAppBar';
import { Panel } from '@/app/(main)/_components/panel/Panel';
import { MapContainer } from '@/app/(main)/_components/map/MapContainer';
import { MapOverlay } from '@/app/(main)/_components/map/MapOverlay';

export default function MainPage() {
  return (
    <>
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
    </>
  );
}
