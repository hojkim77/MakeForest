'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Todo } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { useKstDateStore } from '@/shared/store/kstDateStore';

export function useCreateTodoMutation(userId: string | null) {
  const queryClient = useQueryClient();
  const kstDate = useKstDateStore((s) => s.kstDate);

  return useMutation<Todo, Error, { text: string }, { previousTodos: unknown }>({
    mutationFn: ({ text }) =>
      api.post<Todo>(API_PATHS.TODOS(), { date: kstDate, text }),

    onMutate: async ({ text }) => {
      if (!userId) return { previousTodos: undefined };
      const key = qk.todos.byDate(userId, kstDate);
      await queryClient.cancelQueries({ queryKey: key });
      const previousTodos = queryClient.getQueryData(key);
      const optimistic: Todo = { id: `optimistic-${Date.now()}`, text, done: false };
      queryClient.setQueryData<Todo[]>(key, (prev) =>
        prev ? [...prev, optimistic] : [optimistic],
      );
      return { previousTodos };
    },

    onError: (_err, _vars, context) => {
      if (!userId || context?.previousTodos === undefined) return;
      queryClient.setQueryData(qk.todos.byDate(userId, kstDate), context.previousTodos);
    },

    onSettled: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: qk.todos.byDate(userId, kstDate) });
    },
  });
}

export function useUpdateTodoMutation(userId: string | null) {
  const queryClient = useQueryClient();
  const kstDate = useKstDateStore((s) => s.kstDate);

  return useMutation<Todo, Error, { id: string; text?: string; done?: boolean }, { previousTodos: unknown }>({
    mutationFn: ({ id, ...body }) =>
      api.patch<Todo>(API_PATHS.TODO(id), body),

    onMutate: async ({ id, text, done }) => {
      if (!userId) return { previousTodos: undefined };
      const key = qk.todos.byDate(userId, kstDate);
      await queryClient.cancelQueries({ queryKey: key });
      const previousTodos = queryClient.getQueryData(key);
      queryClient.setQueryData<Todo[]>(key, (prev) =>
        prev
          ? prev.map((t) =>
              t.id === id
                ? { ...t, ...(text !== undefined ? { text } : {}), ...(done !== undefined ? { done } : {}) }
                : t,
            )
          : prev,
      );
      return { previousTodos };
    },

    onError: (_err, _vars, context) => {
      if (!userId || context?.previousTodos === undefined) return;
      queryClient.setQueryData(qk.todos.byDate(userId, kstDate), context.previousTodos);
    },

    onSettled: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: qk.todos.byDate(userId, kstDate) });
    },
  });
}

export function useDeleteTodoMutation(userId: string | null) {
  const queryClient = useQueryClient();
  const kstDate = useKstDateStore((s) => s.kstDate);

  return useMutation<void, Error, { id: string }, { previousTodos: unknown }>({
    mutationFn: ({ id }) => api.delete(API_PATHS.TODO(id)),

    onMutate: async ({ id }) => {
      if (!userId) return { previousTodos: undefined };
      const key = qk.todos.byDate(userId, kstDate);
      await queryClient.cancelQueries({ queryKey: key });
      const previousTodos = queryClient.getQueryData(key);
      queryClient.setQueryData<Todo[]>(key, (prev) =>
        prev ? prev.filter((t) => t.id !== id) : prev,
      );
      return { previousTodos };
    },

    onError: (_err, _vars, context) => {
      if (!userId || context?.previousTodos === undefined) return;
      queryClient.setQueryData(qk.todos.byDate(userId, kstDate), context.previousTodos);
    },

    onSettled: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: qk.todos.byDate(userId, kstDate) });
    },
  });
}
