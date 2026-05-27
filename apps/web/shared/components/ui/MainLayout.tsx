'use client';

import { useViewStore } from '@/shared/store/layoutStore';

interface Props {
  panel: React.ReactNode;
  map: React.ReactNode;
}

export function MainLayout({ panel, map }: Props) {
  const view = useViewStore((s) => s.view);

  return (
    <main data-view={view} className="pt-[calc(var(--topbar-h)+var(--safe-top))] pb-[calc(var(--tabbar-h)+var(--safe-bottom))] md:pb-0 h-dvh flex flex-col md:flex-row overflow-hidden">
      <aside className="hidden panel-view:flex flex-col h-full overflow-hidden md:flex md:w-panel md:flex-shrink-0">
        {panel}
      </aside>

      <section className="hidden map-view:flex map-view:flex-1 flex-col relative overflow-hidden bg-inverse-surface md:flex md:flex-1">
        {map}
      </section>
    </main>
  );
}
