import { MapContainer } from '@/components/map/MapContainer';

export default function MainPage() {
  return (
    <main className="flex h-screen overflow-hidden">
      {/* 왼쪽 패널 — 타이머, 할 일 */}
      <aside className="w-80 flex-shrink-0 bg-gray-900 text-white p-4">
        {/* <Panel /> */}
      </aside>
      {/* 맵 영역 */}
      <section className="flex-1 relative">
        <MapContainer />
      </section>
    </main>
  );
}
