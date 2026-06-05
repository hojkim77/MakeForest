'use client';

import { useEffect, useRef } from 'react';
import { useKstDateStore } from '@/shared/store/kstDateStore';
import { useSessionDraftStore } from '@/shared/store/sessionDraftStore';
import { useTodoStore } from '@/shared/store/todoStore';

export function useMidnightReset() {
  const kstDate = useKstDateStore((s) => s.kstDate);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    useSessionDraftStore.getState().reset();
    useTodoStore.getState().init([]);
  }, [kstDate]);
}
