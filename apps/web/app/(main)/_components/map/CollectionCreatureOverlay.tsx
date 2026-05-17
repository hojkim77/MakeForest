'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePixelMapData } from '@/shared/hooks/usePixelMapData';
import { CollectionCreatureSprite } from '@/shared/components/ui/CollectionCreatureSprite';

interface CollectionState {
  creatureType: string;
  isCompleted: boolean;
}

const SERVER_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000')
    : 'http://localhost:4000';

function seededCellIndex(dongCode: string, length: number): number {
  const hash = dongCode.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % length;
}

interface Props {
  mapW: number;
  mapH: number;
  scale: number;
}

export function CollectionCreatureOverlay({ mapW, mapH, scale }: Props) {
  const { data: session } = useSession();
  const dongCode = session?.user?.dongCode ?? null;
  const { data: pixelMap } = usePixelMapData();
  const [collection, setCollection] = useState<CollectionState | null>(null);

  useEffect(() => {
    if (!dongCode) return;

    let cancelled = false;
    fetch(`${SERVER_URL}/collection/today?dongCode=${encodeURIComponent(dongCode)}`)
      .then((r) => r.json())
      .then((data: CollectionState) => { if (!cancelled) setCollection(data); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [dongCode]);

  // 미션 완료 시에만 장식 스프라이트 표시
  if (!dongCode || !collection?.isCompleted) return null;

  const dongCells = pixelMap.cells.filter((c) => c.code === dongCode);
  if (!dongCells.length) return null;

  const cell = dongCells[seededCellIndex(dongCode, dongCells.length)]!;
  const left = (cell.x / mapW) * 100;
  const top = (cell.y / mapH) * 100;

  const spritePx = Math.max(16, 40 / scale);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: 1,
          height: 1,
          overflow: 'visible',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            filter: 'drop-shadow(0 0 4px gold)',
            pointerEvents: 'none',
          }}
        >
          <CollectionCreatureSprite creatureType={collection.creatureType} size={spritePx} />
        </div>
      </div>
    </div>
  );
}
