'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Todo } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { useKstDateStore } from '@/shared/store/kstDateStore';
import { useTodoStore } from '@/shared/store/todoStore';
import { useTimerStore } from '@/shared/store/timerStore';

interface TodaySession {
  id: string;
  startedAt: string;
  status: string;
  todos: Todo[];
}

interface Options {
  userId: string | null;
  initialData?: TodaySession | null;
}

export function useSessionQuery({ userId, initialData }: Options) {
  const kstDate = useKstDateStore((s) => s.kstDate);
  const seededRef = useRef(false);

  const query = useQuery({
    queryKey: userId ? qk.sessions.today(userId, kstDate) : (['sessions', 'disabled'] as const),
    queryFn: (): Promise<TodaySession | null> =>
      api.get<TodaySession>(API_PATHS.SERVER_SESSION_TODAY(userId!)).catch(() => null),
    enabled: !!userId,
    ...(userId && initialData !== undefined
      ? { initialData: initialData, initialDataUpdatedAt: Date.now() }
      : {}),
  });

  const session = query.data as TodaySession | null | undefined;

  useEffect(() => {
    if (seededRef.current) return;
    if (!session) return;

    seededRef.current = true;

    useTodoStore.getState().init(session.todos ?? []);
    if (session.status === 'RUNNING') {
      useTimerStore.getState().startSession(session.id, Date.parse(session.startedAt));
    } else if (session.status === 'COMPLETED') {
      useTimerStore.setState({ sessionId: session.id, status: 'complete' });
    }
  }, [session]);

  return query;
}
