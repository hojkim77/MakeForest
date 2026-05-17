'use client';

import { usePanelStore } from '@/shared/store';
import { DailyCollectionCard, type CollectionData } from './DailyCollectionCard';

interface Props {
  dongCode: string | null;
  regionCode: string | null;
  initialCollection: CollectionData | null;
}

const TAB_BUTTON_WIDTH = 28;

export function PanelSideTabs({ dongCode, regionCode, initialCollection }: Props) {
  const open = usePanelStore((s) => s.collectionDrawerOpen);
  const toggle = usePanelStore((s) => s.toggleCollectionDrawer);

  return (
    <>
      {/* Tab button — fixed to right edge of panel */}
      <div
        className="fixed top-[49px] flex flex-col gap-xs pt-lg z-30"
        style={{ left: 420 }}
      >
        <TabButton label="공통 미션" active={open} onClick={toggle} />
      </div>

      {/* Drawer — always mounted so SSE stays connected; hidden when closed */}
      <div
        className={`fixed top-[49px] w-64 max-h-[calc(100vh-49px-2rem)] bg-surface-container border border-outline-variant overflow-y-auto z-20 ${open ? '' : 'hidden'}`}
        style={{ left: 420 + TAB_BUTTON_WIDTH }}
      >
        <div className="p-md">
          <DailyCollectionCard
            dongCode={dongCode}
            regionCode={regionCode}
            initialCollection={initialCollection}
          />
        </div>
      </div>
    </>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`
        w-7 px-1 py-md
        border border-outline-variant
        font-mono text-label
        flex items-center justify-center
        transition-colors
        ${active
          ? 'bg-primary text-on-primary border-primary'
          : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'
        }
      `}
      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
    >
      {label}
    </button>
  );
}
