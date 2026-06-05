'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGuideStateQuery } from '@/shared/hooks/queries/useGuideStateQuery';
import { useGuideTourCompleteMutation } from '@/shared/hooks/mutations/useGuideTourCompleteMutation';
import { useGuideDailyDismissMutation } from '@/shared/hooks/mutations/useGuideDailyDismissMutation';
import { FullTourOverlay } from './FullTourOverlay';
import { DailyGuideBubbles } from './DailyGuideBubbles';
import type { FullTourStepIdType, DailyGuideStepIdType, GuideStateResType } from '@makeforest/types';

type DailyPayload = Extract<GuideStateResType, { kind: 'daily' }>['payload'];

export function GuideController() {
  const { isPending, data } = useGuideStateQuery();
  const loading = isPending;
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const tourCompleteMutation = useGuideTourCompleteMutation();
  const dailyDismissMutation = useGuideDailyDismissMutation();

  // Delay mount to avoid SSR flash — show after fetch completes
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [loading]);

  const handleTourDone = useCallback((outcome: 'completed' | 'skipped') => {
    setDismissed(true);
    tourCompleteMutation.mutate({ outcome });
  }, [tourCompleteMutation]);

  const handleDailyDone = useCallback((outcome: 'completed' | 'skipped') => {
    setDismissed(true);
    dailyDismissMutation.mutate({ outcome });
  }, [dailyDismissMutation]);

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
