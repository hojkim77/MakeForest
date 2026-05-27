import { render, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainSseHandler } from '../MainSseHandler';
import { qk } from '@/shared/lib/queryKeys';

// ── MockEventSource ──────────────────────────────────────────────────────────
// MainSseHandler opens 2 SSE connections (activityUrl + regionUrl),
// so we track instances by URL prefix to reference the right one.
class MockEventSource {
  static instances: MockEventSource[] = [];

  // activityUrl: /sse/activity-stream (regionCode 없음)
  // regionUrl:   /sse/activity-stream/regionCode/{rc}
  static latestActivity(): MockEventSource | undefined {
    return [...MockEventSource.instances]
      .reverse()
      .find((i) => i.url.includes('activity-stream') && !i.url.includes('regionCode'));
  }

  static latestRegion(): MockEventSource | undefined {
    return [...MockEventSource.instances]
      .reverse()
      .find((i) => i.url.includes('regionCode'));
  }

  url: string;
  onerror: (() => void) | null = null;
  listeners: Record<string, (e: MessageEvent) => void> = {};
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (e: MessageEvent) => void) {
    this.listeners[type] = cb;
  }

  triggerEvent(type: string, data: object) {
    this.listeners[type]?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  triggerError() {
    this.onerror?.();
  }
}

(global as unknown as Record<string, unknown>).EventSource = MockEventSource;

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('next-auth/react', () => ({
  useSession: jest.fn().mockReturnValue({
    data: { user: { regionCode: '11' } },
    status: 'authenticated',
  }),
}));

jest.mock('@/shared/store', () => ({
  useMapStore: jest.fn((selector: (s: { focusedRegionCode: string | null }) => unknown) =>
    selector({ focusedRegionCode: null }),
  ),
}));

jest.mock('@/shared/lib/toast', () => ({
  toast: { info: jest.fn(), error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/shared/store/kstDateStore', () => ({
  useKstDateStore: jest.fn((selector: (s: { kstDate: string }) => unknown) =>
    selector({ kstDate: '2026-05-25' }),
  ),
}));

function setupFetch() {
  mockFetch.mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ heatmap: {}, users: [] }),
    }),
  );
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  MockEventSource.instances = [];
  mockFetch.mockReset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SSE 연결', () => {
  it('마운트 시 /sse/activity-stream URL로 연결', () => {
    setupFetch();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MainSseHandler />, { wrapper: makeWrapper(queryClient) });

    expect(MockEventSource.latestActivity()).toBeDefined();
    expect(MockEventSource.latestRegion()).toBeDefined();
  });

  it('언마운트 시 EventSource.close() 호출', () => {
    setupFetch();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(<MainSseHandler />, { wrapper: makeWrapper(queryClient) });
    const instances = [...MockEventSource.instances];

    unmount();
    instances.forEach((i) => expect(i.close).toHaveBeenCalled());
  });
});

describe('heatmap:update 이벤트', () => {
  it('수신한 데이터를 QueryClient 캐시에 반영', async () => {
    jest.useRealTimers();
    setupFetch();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MainSseHandler />, { wrapper: makeWrapper(queryClient) });

    await act(async () => {
      MockEventSource.latestActivity()!.triggerEvent('heatmap:update', { '1111000': 2, '9999000': 1 });
    });

    await waitFor(() => {
      const snapshot = queryClient.getQueryData(qk.map.snapshot()) as
        | { heatmap: Record<string, number> }
        | undefined;
      return snapshot?.heatmap['1111000'] !== undefined;
    });

    const snapshot = queryClient.getQueryData(qk.map.snapshot()) as
      | { heatmap: Record<string, number> }
      | undefined;
    expect(snapshot?.heatmap).toEqual({ '1111000': 2, '9999000': 1 });
    jest.useFakeTimers();
  });
});

describe('session:toast 이벤트', () => {
  it('toast 표시 + collection 캐시 업데이트', async () => {
    jest.useRealTimers();
    const { toast } = await import('@/shared/lib/toast');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const kstDate = '2026-05-25';
    const regionCode = '11';
    queryClient.setQueryData(['collection', 'today', regionCode, kstDate], {
      creatureType: 'MUSHROOM', currentCount: 38, targetCount: 50, isCompleted: false,
    });

    render(<MainSseHandler />, { wrapper: makeWrapper(queryClient) });

    await act(async () => {
      MockEventSource.latestRegion()!.triggerEvent('session:toast', {
        dongCode: '1111010100',
        nickname: '김OO',
        collectionProgress: { creatureType: 'MUSHROOM', currentCount: 39, targetCount: 50, isCompleted: false },
      });
    });

    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('김OO'));
    const cached = queryClient.getQueryData(['collection', 'today', regionCode, kstDate]) as { currentCount: number };
    expect(cached.currentCount).toBe(39);
    jest.useFakeTimers();
  });
});

// 재연결 테스트는 activityUrl SSE만 대상으로 한다 (regionUrl도 동일한 ssePool 로직을 따름).
describe('오류 및 재연결 (지수 백오프)', () => {
  function getActivitySse() {
    return MockEventSource.latestActivity()!;
  }

  it('onerror → 1000ms 후 재연결', () => {
    setupFetch();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MainSseHandler />, { wrapper: makeWrapper(queryClient) });
    // 마운트 시 activity + region = 2개 연결
    const initialCount = MockEventSource.instances.length;
    const first = getActivitySse();

    act(() => { first.triggerError(); });
    expect(MockEventSource.instances.length).toBe(initialCount);

    act(() => { jest.advanceTimersByTime(999); });
    expect(MockEventSource.instances.length).toBe(initialCount);

    act(() => { jest.advanceTimersByTime(1); });
    expect(MockEventSource.instances.length).toBe(initialCount + 1);
  });

  it('두 번째 오류 → 2000ms 후 재연결 (백오프 2배)', () => {
    setupFetch();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MainSseHandler />, { wrapper: makeWrapper(queryClient) });
    const initialCount = MockEventSource.instances.length;

    act(() => { getActivitySse().triggerError(); });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(MockEventSource.instances.length).toBe(initialCount + 1);

    act(() => { getActivitySse().triggerError(); });
    act(() => { jest.advanceTimersByTime(1999); });
    expect(MockEventSource.instances.length).toBe(initialCount + 1);

    act(() => { jest.advanceTimersByTime(1); });
    expect(MockEventSource.instances.length).toBe(initialCount + 2);
  });

  it('언마운트 후 오류 → 재연결 없음', () => {
    setupFetch();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(<MainSseHandler />, { wrapper: makeWrapper(queryClient) });
    const activitySse = getActivitySse();
    unmount();

    const countAfterUnmount = MockEventSource.instances.length;
    act(() => { activitySse.triggerError(); });
    act(() => { jest.advanceTimersByTime(60000); });

    expect(MockEventSource.instances.length).toBe(countAfterUnmount);
  });

  it('성공적인 이벤트 수신 후 오류 → retryDelay 1000ms로 리셋', () => {
    setupFetch();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MainSseHandler />, { wrapper: makeWrapper(queryClient) });
    const initialCount = MockEventSource.instances.length;

    act(() => { getActivitySse().triggerError(); });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(MockEventSource.instances.length).toBe(initialCount + 1);

    act(() => {
      getActivitySse().triggerEvent('heatmap:update', { '1111': 1 });
    });

    act(() => { getActivitySse().triggerError(); });
    act(() => { jest.advanceTimersByTime(999); });
    expect(MockEventSource.instances.length).toBe(initialCount + 1);

    act(() => { jest.advanceTimersByTime(1); });
    expect(MockEventSource.instances.length).toBe(initialCount + 2);
  });
});
