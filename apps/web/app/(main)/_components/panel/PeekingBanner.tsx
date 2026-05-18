'use client';

import { useMapStore } from '@/shared/store';
import { Icon } from '@/shared/components/ui/Icon';

export function PeekingBanner({ myRegionCode }: { myRegionCode: string | null }) {
  const focusedRegionCode = useMapStore((s) => s.focusedRegionCode);
  const focusRegion = useMapStore((s) => s.focusRegion);
  const isPeeking = focusedRegionCode !== null && focusedRegionCode !== myRegionCode;

  if (!isPeeking) return null;

  return (
    <button
      onClick={() => focusRegion(myRegionCode)}
      className="flex items-center gap-sm p-sm bg-primary-fixed text-on-primary-fixed font-mono text-label uppercase tracking-wider w-full border border-primary active:translate-y-px transition-none"
    >
      <Icon name="arrow_back" size={16} />
      내 동네로 돌아가기
    </button>
  );
}
