'use client';

import { useEffect, useState } from 'react';

export interface DongPixel {
  x: number;
  y: number;
  code: string;
  name: string;
}

interface PixelMapFile {
  w: number;
  h: number;
  cells: DongPixel[];
}

let cache: PixelMapFile | null = null;

export function usePixelMapData() {
  const [data, setData] = useState<PixelMapFile>(cache ?? { w: 250, h: 290, cells: [] });
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache !== null) return;

    fetch('/pixel-map.json')
      .then((r) => r.json())
      .then((json: PixelMapFile) => {
        cache = json;
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}
