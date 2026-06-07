'use client';

import { useQuery } from '@tanstack/react-query';
import type { Todo } from '@makeforest/types';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { useKstDateStore } from '@/shared/store/kstDateStore';

interface Options {
  userId: string | null;
}

export function useTodosQuery({ userId }: Options) {
  const kstDate = useKstDateStore((s) => s.kstDate);

  return useQuery<Todo[]>({
    queryKey: userId ? qk.todos.byDate(userId, kstDate) : (['todos', 'disabled'] as const),
    queryFn: () => api.get<Todo[]>(`${API_PATHS.TODOS()}?date=${encodeURIComponent(kstDate)}`),
    enabled: !!userId,
  });
}
