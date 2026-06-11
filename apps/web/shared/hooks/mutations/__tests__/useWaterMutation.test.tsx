import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWaterMutation } from '../useWaterMutation';
import { qk } from '@/shared/lib/queryKeys';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockApiPost = jest.fn();

jest.mock('@/shared/lib/api', () => ({
  api: { post: (...args: unknown[]) => mockApiPost(...args) },
}));

jest.mock('@/shared/lib/apiPaths', () => ({
  API_PATHS: {
    WATER: () => '/api/water',
  },
}));

const USER_ID = 'user-1';
const KST_DATE = '2026-06-11';

const waterResponse = {
  waterCount: 1,
  date: KST_DATE,
  focusLengthMin: 30,
  segmentCount: 12,
  creatureStage: 1,
  creatureWaterCount: 5,
  creatureFocusMinutes: 60,
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useWaterMutation — onSettled mypage invalidations', () => {
  it('물주기 성공 후 user.me 쿼리가 invalidate된다', async () => {
    const queryClient = makeQueryClient();
    const userMeKey = qk.user.me(USER_ID);
    queryClient.setQueryData(userMeKey, { nickname: '테스터' });

    mockApiPost.mockResolvedValue(waterResponse);

    const { result } = renderHook(() => useWaterMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => { result.current.mutate({ userId: USER_ID, kstDate: KST_DATE }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const state = queryClient.getQueryState(userMeKey);
    expect(state?.isInvalidated).toBe(true);
  });

  it('물주기 성공 후 stats.focus 쿼리가 invalidate된다', async () => {
    const queryClient = makeQueryClient();
    const focusKey = qk.stats.focus(USER_ID);
    queryClient.setQueryData(focusKey, { totalFocusSec: 3600, currentStreak: 5, maxStreak: 10 });

    mockApiPost.mockResolvedValue(waterResponse);

    const { result } = renderHook(() => useWaterMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => { result.current.mutate({ userId: USER_ID, kstDate: KST_DATE }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const state = queryClient.getQueryState(focusKey);
    expect(state?.isInvalidated).toBe(true);
  });

  it('물주기 성공 후 stats.rank 쿼리가 prefix로 invalidate된다', async () => {
    const queryClient = makeQueryClient();
    const rankKey = qk.stats.rank(USER_ID, '1168010100');
    queryClient.setQueryData(rankKey, { neighborhoodRank: 1, neighborhoodTotal: 50 });

    mockApiPost.mockResolvedValue(waterResponse);

    const { result } = renderHook(() => useWaterMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => { result.current.mutate({ userId: USER_ID, kstDate: KST_DATE }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const state = queryClient.getQueryState(rankKey);
    expect(state?.isInvalidated).toBe(true);
  });

  it('물주기 성공 후 stats.weekly 쿼리가 invalidate된다', async () => {
    const queryClient = makeQueryClient();
    const weeklyKey = qk.stats.weekly(USER_ID);
    queryClient.setQueryData(weeklyKey, { weeklyData: [], weeklyAvg: 0 });

    mockApiPost.mockResolvedValue(waterResponse);

    const { result } = renderHook(() => useWaterMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => { result.current.mutate({ userId: USER_ID, kstDate: KST_DATE }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const state = queryClient.getQueryState(weeklyKey);
    expect(state?.isInvalidated).toBe(true);
  });

  it('물주기 실패 시에도 onSettled가 실행되어 mypage 쿼리가 invalidate된다', async () => {
    const queryClient = makeQueryClient();
    const userMeKey = qk.user.me(USER_ID);
    queryClient.setQueryData(userMeKey, { nickname: '테스터' });

    mockApiPost.mockRejectedValue(new Error('서버 오류'));

    const { result } = renderHook(() => useWaterMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => { result.current.mutate({ userId: USER_ID, kstDate: KST_DATE }); });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const state = queryClient.getQueryState(userMeKey);
    expect(state?.isInvalidated).toBe(true);
  });
});
