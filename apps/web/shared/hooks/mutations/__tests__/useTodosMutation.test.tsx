import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateTodoMutation, useUpdateTodoMutation, useDeleteTodoMutation } from '../useTodosMutation';
import { qk } from '@/shared/lib/queryKeys';
import type { Todo } from '@makeforest/types';

// ── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/shared/store/kstDateStore', () => ({
  useKstDateStore: () => '2026-06-11',
}));

const mockApiPost = jest.fn();
const mockApiPatch = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('@/shared/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockApiPost(...args),
    patch: (...args: unknown[]) => mockApiPatch(...args),
    delete: (...args: unknown[]) => mockApiDelete(...args),
  },
}));

jest.mock('@/shared/lib/apiPaths', () => ({
  API_PATHS: {
    TODOS: () => '/api/todos',
    TODO: (id: string) => `/api/todos/${id}`,
  },
}));

const KST_DATE = '2026-06-11';
const USER_ID = 'user-1';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return { id: 'todo-1', text: '할 일', done: false, ...overrides };
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useCreateTodoMutation — 낙관적 업데이트', () => {
  it('mutate 즉시 todo 목록에 항목이 추가된다', async () => {
    const queryClient = makeQueryClient();
    const key = qk.todos.byDate(USER_ID, KST_DATE);
    queryClient.setQueryData<Todo[]>(key, []);

    mockApiPost.mockResolvedValue(makeTodo({ id: 'server-id', text: '새 할 일' }));

    const { result } = renderHook(
      () => useCreateTodoMutation(USER_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => { result.current.mutate({ text: '새 할 일' }); });

    await waitFor(() => {
      const todos = queryClient.getQueryData<Todo[]>(key);
      expect(todos?.some((t) => t.text === '새 할 일')).toBe(true);
    });
  });

  it('서버 오류 시 롤백된다', async () => {
    const queryClient = makeQueryClient();
    const key = qk.todos.byDate(USER_ID, KST_DATE);
    const original: Todo[] = [makeTodo()];
    queryClient.setQueryData<Todo[]>(key, original);

    mockApiPost.mockRejectedValue(new Error('서버 오류'));

    const { result } = renderHook(
      () => useCreateTodoMutation(USER_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => { result.current.mutate({ text: '추가 실패할 항목' }); });

    await waitFor(() => {
      const todos = queryClient.getQueryData<Todo[]>(key);
      expect(todos).toEqual(original);
    });
  });
});

describe('useUpdateTodoMutation — 낙관적 업데이트', () => {
  it('mutate 즉시 done 상태가 반전된다', async () => {
    const queryClient = makeQueryClient();
    const key = qk.todos.byDate(USER_ID, KST_DATE);
    queryClient.setQueryData<Todo[]>(key, [makeTodo({ id: 'todo-1', done: false })]);

    mockApiPatch.mockResolvedValue(makeTodo({ id: 'todo-1', done: true }));

    const { result } = renderHook(
      () => useUpdateTodoMutation(USER_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => { result.current.mutate({ id: 'todo-1', done: true }); });

    await waitFor(() => {
      const todos = queryClient.getQueryData<Todo[]>(key);
      expect(todos?.find((t) => t.id === 'todo-1')?.done).toBe(true);
    });
  });

  it('서버 오류 시 롤백된다', async () => {
    const queryClient = makeQueryClient();
    const key = qk.todos.byDate(USER_ID, KST_DATE);
    const original: Todo[] = [makeTodo({ id: 'todo-1', done: false })];
    queryClient.setQueryData<Todo[]>(key, original);

    mockApiPatch.mockRejectedValue(new Error('서버 오류'));

    const { result } = renderHook(
      () => useUpdateTodoMutation(USER_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => { result.current.mutate({ id: 'todo-1', done: true }); });

    await waitFor(() => {
      const todos = queryClient.getQueryData<Todo[]>(key);
      expect(todos?.[0]?.done).toBe(false);
    });
  });
});

describe('useDeleteTodoMutation — 낙관적 업데이트', () => {
  it('mutate 즉시 목록에서 해당 항목이 제거된다', async () => {
    const queryClient = makeQueryClient();
    const key = qk.todos.byDate(USER_ID, KST_DATE);
    queryClient.setQueryData<Todo[]>(key, [makeTodo({ id: 'todo-1' }), makeTodo({ id: 'todo-2' })]);

    mockApiDelete.mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useDeleteTodoMutation(USER_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => { result.current.mutate({ id: 'todo-1' }); });

    await waitFor(() => {
      const todos = queryClient.getQueryData<Todo[]>(key);
      expect(todos?.find((t) => t.id === 'todo-1')).toBeUndefined();
      expect(todos?.find((t) => t.id === 'todo-2')).toBeDefined();
    });
  });

  it('서버 오류 시 롤백된다', async () => {
    const queryClient = makeQueryClient();
    const key = qk.todos.byDate(USER_ID, KST_DATE);
    const original: Todo[] = [makeTodo({ id: 'todo-1' }), makeTodo({ id: 'todo-2' })];
    queryClient.setQueryData<Todo[]>(key, original);

    mockApiDelete.mockRejectedValue(new Error('서버 오류'));

    const { result } = renderHook(
      () => useDeleteTodoMutation(USER_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => { result.current.mutate({ id: 'todo-1' }); });

    await waitFor(() => {
      const todos = queryClient.getQueryData<Todo[]>(key);
      expect(todos).toEqual(original);
    });
  });
});
