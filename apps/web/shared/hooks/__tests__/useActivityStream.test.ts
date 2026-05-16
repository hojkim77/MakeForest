import { renderHook, act, waitFor } from '@testing-library/react';
import { useActivityStream } from '@/shared/hooks/useActivityStream';
import { useActivityStore } from '@/shared/store/activityStore';

// ── MockEventSource ──────────────────────────────────────────────────────────
class MockEventSource {
  static lastInstance: MockEventSource | null = null;
  static callCount = 0;

  url: string;
  onerror: (() => void) | null = null;
  listeners: Record<string, (e: MessageEvent) => void> = {};
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.lastInstance = this;
    MockEventSource.callCount++;
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

(global as any).EventSource = MockEventSource;

// ── Mock: fetch ──────────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

function setupFetch() {
  mockFetch.mockImplementation(() =>
    Promise.resolve({
      json: () => Promise.resolve({ heatmap: {}, users: [] }),
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  MockEventSource.lastInstance = null;
  MockEventSource.callCount = 0;
  mockFetch.mockReset();
  useActivityStore.setState({ activity: {}, activeUsers: [] });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SSE 연결', () => {
  it('마운트 시 /map/activity-stream URL로 연결', () => {
    setupFetch();
    renderHook(() => useActivityStream());

    expect(MockEventSource.lastInstance).not.toBeNull();
    expect(MockEventSource.lastInstance!.url).toContain('/sse/activity-stream');
  });

  it('언마운트 시 EventSource.close() 호출', () => {
    setupFetch();
    const { unmount } = renderHook(() => useActivityStream());
    const instance = MockEventSource.lastInstance!;

    unmount();
    expect(instance.close).toHaveBeenCalled();
  });
});

describe('heatmap:update 이벤트', () => {
  it('수신한 데이터를 그대로 store에 반영', async () => {
    setupFetch();
    renderHook(() => useActivityStream());
    await waitFor(() => MockEventSource.lastInstance !== null);

    await act(async () => {
      MockEventSource.lastInstance!.triggerEvent('heatmap:update', {
        '1111000': 2,
        '9999000': 1,
      });
    });

    await waitFor(() => useActivityStore.getState().activity['1111000'] !== undefined);
    expect(useActivityStore.getState().activity).toEqual({ '1111000': 2, '9999000': 1 });
  });
});

describe('오류 및 재연결 (지수 백오프)', () => {
  it('onerror → 1000ms 후 재연결', () => {
    setupFetch();
    renderHook(() => useActivityStream());
    const first = MockEventSource.lastInstance!;

    act(() => { first.triggerError(); });
    expect(MockEventSource.callCount).toBe(1);

    act(() => { jest.advanceTimersByTime(999); });
    expect(MockEventSource.callCount).toBe(1);

    act(() => { jest.advanceTimersByTime(1); });
    expect(MockEventSource.callCount).toBe(2);
  });

  it('두 번째 오류 → 2000ms 후 재연결 (백오프 2배)', () => {
    setupFetch();
    renderHook(() => useActivityStream());

    // 1차 오류
    act(() => { MockEventSource.lastInstance!.triggerError(); });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(MockEventSource.callCount).toBe(2);

    // 2차 오류
    act(() => { MockEventSource.lastInstance!.triggerError(); });
    act(() => { jest.advanceTimersByTime(1999); });
    expect(MockEventSource.callCount).toBe(2);

    act(() => { jest.advanceTimersByTime(1); });
    expect(MockEventSource.callCount).toBe(3);
  });

  it('언마운트 후 오류 → 재연결 없음', () => {
    setupFetch();
    const { unmount } = renderHook(() => useActivityStream());
    const instance = MockEventSource.lastInstance!;
    unmount();

    const countAfterUnmount = MockEventSource.callCount;
    act(() => { instance.triggerError(); });
    act(() => { jest.advanceTimersByTime(60000); });

    expect(MockEventSource.callCount).toBe(countAfterUnmount);
  });

  it('성공적인 이벤트 수신 후 오류 → retryDelay 1000ms로 리셋', async () => {
    setupFetch();
    renderHook(() => useActivityStream());

    // 1차 오류 → 재연결
    act(() => { MockEventSource.lastInstance!.triggerError(); });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(MockEventSource.callCount).toBe(2);

    // 성공적인 이벤트 수신 → retryDelay 리셋
    await act(async () => {
      MockEventSource.lastInstance!.triggerEvent('heatmap:update', { '1111': 1 });
    });
    await waitFor(() => useActivityStore.getState().activity['1111'] !== undefined);

    // 다시 오류 → retryDelay 리셋됐으므로 1000ms 후 재연결
    act(() => { MockEventSource.lastInstance!.triggerError(); });
    act(() => { jest.advanceTimersByTime(999); });
    expect(MockEventSource.callCount).toBe(2);

    act(() => { jest.advanceTimersByTime(1); });
    expect(MockEventSource.callCount).toBe(3);
  });
});
