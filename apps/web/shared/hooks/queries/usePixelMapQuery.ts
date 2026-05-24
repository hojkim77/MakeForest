'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from '@/shared/lib/queryKeys';

export interface DongPixel {
  x: number;
  y: number;
  code: string;
  name: string;
}

export interface PixelMapFile {
  w: number;
  h: number;
  cells: DongPixel[];
}

const EMPTY: PixelMapFile = { w: 250, h: 290, cells: [] };

export function usePixelMapQuery() {
  const { data = EMPTY, isPending } = useQuery<PixelMapFile>({
    queryKey: qk.map.pixel(),
    queryFn: () => fetch('/pixel-map.json').then((r) => r.json() as Promise<PixelMapFile>),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return { data, loading: isPending };
}
