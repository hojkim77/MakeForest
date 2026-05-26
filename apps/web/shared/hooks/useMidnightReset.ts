'use client';

import { useEffect, useRef } from 'react';
import { useKstDateStore } from '@/shared/store/kstDateStore';
import { useTimerStore } from '@/shared/store/timerStore';
import { useTodoStore } from '@/shared/store/todoStore';

export function useMidnightReset() {
  const kstDate = useKstDateStore((s) => s.kstDate);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    useTimerStore.setState({ sessionId: null, startedAt: null, status: 'idle', cycleCount: 0 });
    useTodoStore.getState().init([]);
  }, [kstDate]);
}
