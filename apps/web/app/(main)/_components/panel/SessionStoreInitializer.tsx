'use client';

import { useRef } from 'react';
import { useTodoStore } from '@/shared/store/todoStore';
import { useTimerStore } from '@/shared/store/timerStore';
import type { Todo } from '@makeforest/types';

export interface TodaySession {
  id: string;
  startedAt: string;
  status: string;
  todos: Todo[];
}

export function SessionStoreInitializer({ session }: { session: TodaySession | null }) {
  const done = useRef(false);
  if (!done.current) {
    done.current = true;
    if (session) {
      useTodoStore.getState().init(session.todos ?? []);
      if (session.status === 'RUNNING') {
        useTimerStore.getState().startSession(session.id, Date.parse(session.startedAt));
      } else if (session.status === 'COMPLETED') {
        useTimerStore.setState({ sessionId: session.id, status: 'complete' });
      }
    }
  }
  return null;
}
