'use client';

import { CollectionCreatureSprite } from '@/shared/components/ui/CollectionCreatureSprite';
import type { CollectionProgress } from '@makeforest/types';
import { useCollectionQuery } from '@/shared/hooks/queries/useCollectionQuery';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';

interface Props {
  dongCode: string | null;
  regionCode: string | null;
  initialCollection: CollectionProgress | null;
}

export function DailyCollectionCard({ dongCode, regionCode, initialCollection }: Props) {
  const { data: collection } = useCollectionQuery({ regionCode, initialData: initialCollection });

  if (!dongCode || !collection) return null;

  const pct = Math.min(100, Math.round((collection.currentCount / collection.targetCount) * 100));
  const remaining = collection.targetCount - collection.currentCount;

  if (collection.isCompleted) {
    return (
      <CompletedState creatureType={collection.creatureType} count={collection.targetCount} />
    );
  }

  return (
    <ActiveState
      creatureType={collection.creatureType}
      currentCount={collection.currentCount}
      targetCount={collection.targetCount}
      pct={pct}
      remaining={remaining}
    />
  );
}

function ActiveState({
  creatureType, currentCount, targetCount, pct, remaining,
}: {
  creatureType: string; currentCount: number; targetCount: number;
  pct: number; remaining: number;
}) {
  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col items-center gap-xs">
        <CollectionCreatureSprite creatureType={creatureType} size={48} />
        <span className="font-mono text-pixel-stat text-on-surface">{creatureType}</span>
      </div>

      <div className="flex flex-col gap-xs">
        <ProgressBar value={pct} size="md" />
        <div className="flex justify-between">
          <span
            className="font-mono text-label text-on-surface-variant"
            data-testid="collection-progress"
          >
            {currentCount} / {targetCount}
          </span>
          <span className="font-mono text-label text-on-surface-variant">달성까지 {remaining}개</span>
        </div>
      </div>
    </div>
  );
}

function CompletedState({ creatureType, count }: { creatureType: string; count: number }) {
  return (
    <div className="flex flex-col items-center gap-sm text-center">
      <CollectionCreatureSprite creatureType={creatureType} size={48} />
      <span className="font-mono text-pixel-stat text-primary">🎉 오늘의 채집 완료!</span>
      <span className="font-mono text-label text-on-surface-variant">
        {creatureType} · {count}개 달성
      </span>
      <span className="font-mono text-label text-on-surface-variant">내일은 어떤 생명체일까요?</span>
    </div>
  );
}
