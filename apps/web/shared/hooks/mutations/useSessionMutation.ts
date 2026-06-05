'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateSessionResType, TodayStateResType, Todo } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface CreateSessionVars {
  todos: Todo[];
  userId: string;
  kstDate: string;
  todayGoal: string;
  focusLengthMin: number;
  segmentCount: number;
}

interface PatchSessionVars {
  sessionId: string;
  action: 'complete' | 'abandon';
  userId: string;
  kstDate: string;
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation<CreateSessionResType, Error, CreateSessionVars, { previousSession: unknown; previousTodayState: unknown }>({
    mutationFn: ({ todos, todayGoal, focusLengthMin, segmentCount }) =>
      api.post<CreateSessionResType>(API_PATHS.SESSIONS(), { todos: todos ?? [], todayGoal, focusLengthMin, segmentCount }),

    onMutate: async ({ userId, kstDate }) => {
      const sessionKey = qk.sessions.today(userId, kstDate);
      const todayStateKey = qk.sessions.todayState(userId, kstDate);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: sessionKey }),
        queryClient.cancelQueries({ queryKey: todayStateKey }),
      ]);
      const previousSession = queryClient.getQueryData(sessionKey);
      const previousTodayState = queryClient.getQueryData(todayStateKey);
      queryClient.setQueryData<TodayStateResType>(todayStateKey, (old) =>
        old ? { ...old, sessionStatus: 'RUNNING', startedAt: new Date().toISOString() } : old,
      );
      return { previousSession, previousTodayState };
    },

    onError: (_err, { userId, kstDate }, context) => {
      if (context?.previousSession !== undefined) {
        queryClient.setQueryData(qk.sessions.today(userId, kstDate), context.previousSession);
      }
      if (context?.previousTodayState !== undefined) {
        queryClient.setQueryData(qk.sessions.todayState(userId, kstDate), context.previousTodayState);
      }
    },

    onSettled: (_data, _err, { userId, kstDate }) => {
      void queryClient.invalidateQueries({ queryKey: qk.sessions.today(userId, kstDate) });
      void queryClient.invalidateQueries({ queryKey: qk.sessions.todayState(userId, kstDate) });
    },
  });
}

export function usePatchSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, PatchSessionVars>({
    mutationFn: ({ sessionId, action }) =>
      api.patch(API_PATHS.SESSION(sessionId), { action }),

    onSettled: (_data, _err, { userId, kstDate }) => {
      void queryClient.invalidateQueries({ queryKey: qk.sessions.today(userId, kstDate) });
    },
  });
}
