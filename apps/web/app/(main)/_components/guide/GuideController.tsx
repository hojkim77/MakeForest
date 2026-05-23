'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGuideState } from './useGuideState';
import { FullTourOverlay } from './FullTourOverlay';
import { DailyGuideBubbles } from './DailyGuideBubbles';
import type { FullTourStepIdType, DailyGuideStepIdType, GuideStateResType } from '@makeforest/types';

type DailyPayload = Extract<GuideStateResType, { kind: 'daily' }>['payload'];

export function GuideController() {
  const { loading, data } = useGuideState();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Delay mount to avoid SSR flash — show after fetch completes
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [loading]);

  const handleTourDone = useCallback(async (outcome: 'completed' | 'skipped') => {
    setDismissed(true);
    try {
      await fetch('/api/guide/tour/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
    } catch {
      // silent — guide simply won't re-appear next visit
    }
  }, []);

  const handleDailyDone = useCallback(async (outcome: 'completed' | 'skipped') => {
    setDismissed(true);
    try {
      await fetch('/api/guide/daily/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
    } catch {
      // silent
    }
  }, []);

  if (!visible || dismissed || !data || data.kind === 'none') return null;

  if (data.kind === 'fullTour') {
    return (
      <FullTourOverlay
        steps={data.steps as FullTourStepIdType[]}
        onDone={handleTourDone}
      />
    );
  }

  if (data.kind === 'daily') {
    return (
      <DailyGuideBubbles
        steps={data.steps as DailyGuideStepIdType[]}
        payload={data.payload as DailyPayload}
        onDone={handleDailyDone}
      />
    );
  }

  return null;
}
