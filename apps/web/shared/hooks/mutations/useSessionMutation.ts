'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateSessionResType, Todo } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface CreateSessionVars {
  todos: Todo[];
  userId: string;
  kstDate: string;
}

interface PatchSessionVars {
  sessionId: string;
  action: 'complete' | 'abandon';
  userId: string;
  kstDate: string;
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation<CreateSessionResType, Error, CreateSessionVars, { previousSession: unknown }>({
    mutationFn: ({ todos }) =>
      api.post<CreateSessionResType>(API_PATHS.SESSIONS(), { todos }),

    onMutate: async ({ userId, kstDate }) => {
      const key = qk.sessions.today(userId, kstDate);
      await queryClient.cancelQueries({ queryKey: key });
      const previousSession = queryClient.getQueryData(key);
      return { previousSession };
    },

    onError: (_err, { userId, kstDate }, context) => {
      if (context?.previousSession !== undefined) {
        queryClient.setQueryData(qk.sessions.today(userId, kstDate), context.previousSession);
      }
    },

    onSettled: (_data, _err, { userId, kstDate }) => {
      void queryClient.invalidateQueries({ queryKey: qk.sessions.today(userId, kstDate) });
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
