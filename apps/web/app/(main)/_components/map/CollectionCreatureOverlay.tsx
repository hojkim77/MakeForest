'use client';

import { useEffect, useState } from 'react';
import { usePixelMapQuery } from '@/shared/hooks/queries/usePixelMapQuery';
import { CollectionCreatureSprite } from '@/shared/components/ui/CollectionCreatureSprite';
import { regionOf } from '@makeforest/types';

interface CompletedCollection {
  creatureType: string;
  date: string;
}

const SERVER_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000')
    : 'http://localhost:4000';

function seededIndex(seed: string, length: number): number {
  const hash = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % length;
}

interface Props {
  mapW: number;
  mapH: number;
  scale: number;
  regionCode: string | null;
}

export function CollectionCreatureOverlay({ mapW, mapH, scale, regionCode }: Props) {
  const { data: pixelMap } = usePixelMapQuery();
  const [completed, setCompleted] = useState<CompletedCollection[]>([]);

  useEffect(() => {
    if (!regionCode) return;

    let cancelled = false;
    fetch(`${SERVER_URL}/collection/completed?regionCode=${encodeURIComponent(regionCode)}`)
      .then((r) => r.json())
      .then((data: CompletedCollection[]) => { if (!cancelled) setCompleted(data); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [regionCode]);

  if (!regionCode || !completed.length) return null;

  const regionCells = pixelMap.cells.filter((c) => regionOf(c.code, c.name) === regionCode);
  if (!regionCells.length) return null;

  const spritePx = Math.max(16, 40 / scale);

  return (
    <div className="pointer-events-none absolute inset-0">
      {completed.map(({ creatureType, date }) => {
        const cell = regionCells[seededIndex(`${regionCode}:${date}`, regionCells.length)]!;
        const left = (cell.x / mapW) * 100;
        const top = (cell.y / mapH) * 100;

        return (
          <div
            key={date}
            className="absolute"
            style={{ left: `${left}%`, top: `${top}%`, width: 1, height: 1, overflow: 'visible' }}
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
              <CollectionCreatureSprite creatureType={creatureType} size={spritePx} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
