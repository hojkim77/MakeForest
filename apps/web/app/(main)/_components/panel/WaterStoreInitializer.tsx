'use client';

import { useRef } from 'react';
import { useWaterStore } from '@/shared/store';

interface Props {
  waterCount: number;
  creatureStage: number;
  totalWaterCount: number;
}

export function WaterStoreInitializer(props: Props) {
  const done = useRef(false);
  if (!done.current) {
    done.current = true;
    useWaterStore.getState().init(props);
  }
  return null;
}
