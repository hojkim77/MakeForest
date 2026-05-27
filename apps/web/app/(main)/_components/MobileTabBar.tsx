'use client';

import { useViewStore, type View } from '@/shared/store/layoutStore';
import { Icon } from '@/shared/components/ui/Icon';

const MOBILE_TABS: Array<{ id: View; label: string; icon: string }> = [
  { id: 'map',   label: 'MAP',  icon: 'map'  },
  { id: 'panel', label: 'HOME', icon: 'home' },
];

export function MobileTabBar() {
  const { view, setView } = useViewStore();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-tab-bar h-[calc(var(--tabbar-h)+var(--safe-bottom))] pb-[var(--safe-bottom)] flex border-t border-outline-variant bg-surface">
      {MOBILE_TABS.map(({ id, label, icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-0.5 font-mono text-[10px] uppercase tracking-wide',
              active ? 'text-primary' : 'text-on-surface-variant',
            ].join(' ')}
            aria-pressed={active}
          >
            <Icon name={icon} size={20} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
