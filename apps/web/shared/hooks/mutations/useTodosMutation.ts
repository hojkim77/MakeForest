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

  return useMutation<Todo, Error, { text: string }>({
    mutationFn: ({ text }) =>
      api.post<Todo>(API_PATHS.TODOS(), { date: kstDate, text }),
    onSuccess: (newTodo) => {
      if (!userId) return;
      queryClient.setQueryData<Todo[]>(qk.todos.byDate(userId, kstDate), (prev) =>
        prev ? [...prev, newTodo] : [newTodo],
      );
    },
  });
}

export function useUpdateTodoMutation(userId: string | null) {
  const queryClient = useQueryClient();
  const kstDate = useKstDateStore((s) => s.kstDate);

  return useMutation<Todo, Error, { id: string; text?: string; done?: boolean }>({
    mutationFn: ({ id, ...body }) =>
      api.patch<Todo>(API_PATHS.TODO(id), body),
    onSuccess: (updated) => {
      if (!userId) return;
      queryClient.setQueryData<Todo[]>(qk.todos.byDate(userId, kstDate), (prev) =>
        prev ? prev.map((t) => (t.id === updated.id ? updated : t)) : prev,
      );
    },
  });
}

export function useDeleteTodoMutation(userId: string | null) {
  const queryClient = useQueryClient();
  const kstDate = useKstDateStore((s) => s.kstDate);

  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => api.delete(API_PATHS.TODO(id)),
    onSuccess: (_data, { id }) => {
      if (!userId) return;
      queryClient.setQueryData<Todo[]>(qk.todos.byDate(userId, kstDate), (prev) =>
        prev ? prev.filter((t) => t.id !== id) : prev,
      );
    },
  });
}
