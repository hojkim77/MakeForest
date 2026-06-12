import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserMeQuery } from '../useUserMeQuery';
import { qk } from '@/shared/lib/queryKeys';
import type { UserMeResType } from '@makeforest/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockApiGet = jest.fn();

jest.mock('@/shared/lib/api', () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

jest.mock('@/shared/lib/apiPaths', () => ({
  API_PATHS: {
    SERVER_USER_ME: (userId: string) => `/mock/user/me?userId=${userId}`,
  },
}));

const USER_ID = 'user-1';

const userMe: UserMeResType = {
  nickname: '테스터',
  avatarUrl: null,
  dongCode: '1168010100',
  dongName: '강남구',
  createdAt: '2024-01-01T00:00:00.000Z',
  userCreature: { stage: 2, totalWaterCount: 10 },
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useUserMeQuery — initialData hydration', () => {
  it('initialData가 있으면 즉시 데이터를 반환한다', () => {
    const queryClient = makeQueryClient();

    const { result } = renderHook(
      () => useUserMeQuery({ userId: USER_ID, initialData: userMe }),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.data).toEqual(userMe);
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('staleTime이 Infinity여서 초기 데이터로 refetch가 발생하지 않는다', async () => {
    const queryClient = makeQueryClient();
    mockApiGet.mockResolvedValue(userMe);

    renderHook(
      () => useUserMeQuery({ userId: USER_ID, initialData: userMe }),
      { wrapper: makeWrapper(queryClient) },
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('userId가 null이면 쿼리가 비활성화된다', () => {
    const queryClient = makeQueryClient();

    const { result } = renderHook(
      () => useUserMeQuery({ userId: null }),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});

describe('useUserMeQuery — queryKey', () => {
  it('올바른 queryKey를 사용한다', () => {
    const queryClient = makeQueryClient();
    mockApiGet.mockResolvedValue(userMe);

    renderHook(
      () => useUserMeQuery({ userId: USER_ID }),
      { wrapper: makeWrapper(queryClient) },
    );

    const expectedKey = qk.user.me(USER_ID);
    expect(queryClient.getQueryState(expectedKey)).toBeDefined();
  });
});

describe('useUserMeQuery — fetch on cache miss', () => {
  it('initialData 없이 마운트 시 API를 호출한다', async () => {
    const queryClient = makeQueryClient();
    mockApiGet.mockResolvedValue(userMe);

    const { result } = renderHook(
      () => useUserMeQuery({ userId: USER_ID }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).toEqual(userMe));
    expect(mockApiGet).toHaveBeenCalledWith(`/mock/user/me?userId=${USER_ID}`);
  });
});
