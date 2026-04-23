import { TopAppBar } from '@/components/ui/TopAppBar';
import { Panel } from '@/components/panel/Panel';
import { MapContainer } from '@/components/map/MapContainer';
import { MapOverlay } from '@/components/map/MapOverlay';

// TODO: fetch real active user count from SSE / API
const MOCK_ACTIVE_USERS = 1249;

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
          <MapOverlay activeUsers={MOCK_ACTIVE_USERS} />
        </section>
      </main>
    </>
  );
}
