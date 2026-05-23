'use client';

import { useEffect, useState } from 'react';
import type { GuideStateResType } from '@makeforest/types';

interface UseGuideStateResult {
  loading: boolean;
  data: GuideStateResType | null;
}

export function useGuideState(): UseGuideStateResult {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GuideStateResType | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/guide/state', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<GuideStateResType>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        // silent fallback — guide simply not shown
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { loading, data };
}
