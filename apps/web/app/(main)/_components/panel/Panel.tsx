import { Suspense } from 'react';
import { auth } from '@/auth';
import { PeekingBanner } from './PeekingBanner';
import { SloganSection } from './SloganSection';
import { PanelMainContents } from './PanelMainContents';
import { PanelSideTabs } from './PanelSideTabs';

export async function Panel() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isLoggedIn = !!userId;
  const myRegionCode = session?.user?.regionCode ?? null;
  const myDongCode = session?.user?.dongCode ?? null;

  return (
    <div className="bg-surface-container md:border-r border-outline flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col gap-lg p-lg flex-1">
        <PeekingBanner myRegionCode={myRegionCode} />
        <SloganSection myRegionCode={myRegionCode} />
        <Suspense fallback={isLoggedIn ? <PanelMainContentsSkeleton /> : null}>
          <PanelMainContents userId={userId} isLoggedIn={isLoggedIn} myRegionCode={myRegionCode} />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <PanelSideTabs myDongCode={myDongCode} myRegionCode={myRegionCode} isLoggedIn={isLoggedIn} />
      </Suspense>
    </div>
  );
}

function PanelMainContentsSkeleton() {
  return (
    <>
      {/* CreatureSection */}
      <div className="flex flex-col items-center gap-md py-lg">
        <div className="flex flex-col items-center justify-center bg-surface-container-high border-2 border-outline p-md gap-xs">
          <div className="w-32 h-32 bg-surface-variant animate-pulse" />
          <div className="h-3 w-20 mt-xs bg-surface-variant animate-pulse" />
        </div>
      </div>

      {/* NeighborhoodStats */}
      <div className="flex flex-col gap-sm p-md bg-surface-container-low border-2 border-outline">
        <div className="h-3 w-32 bg-surface-variant animate-pulse" />
        <div className="flex justify-between items-center">
          <div className="h-3 w-24 bg-surface-variant animate-pulse" />
          <div className="h-3 w-8 bg-surface-variant animate-pulse" />
        </div>
        <div className="w-full h-2 bg-surface-variant" />
      </div>

      {/* TimerWaterSection */}
      <div className="flex flex-col gap-sm border-t border-outline pt-md">
        <div className="flex gap-px w-full h-3">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex-1 bg-surface-variant" />
          ))}
        </div>
        <div className="flex items-end justify-between">
          <div className="h-8 w-20 bg-surface-variant animate-pulse" />
          <div className="h-3 w-24 bg-surface-variant animate-pulse" />
        </div>
        <div className="w-full h-9 bg-surface-variant animate-pulse" />
      </div>
    </>
  );
}
