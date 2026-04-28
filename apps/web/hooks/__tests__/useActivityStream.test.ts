import { renderHook, act, waitFor } from '@testing-library/react';
import { useActivityStream, _resetAliasCache } from '@/hooks/useActivityStream';

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

function setupEmptyAlias() {
  mockFetch.mockResolvedValue({ json: () => Promise.resolve({}) });
}

function setupAlias(alias: Record<string, string>) {
  mockFetch.mockResolvedValue({ json: () => Promise.resolve(alias) });
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  MockEventSource.lastInstance = null;
  MockEventSource.callCount = 0;
  mockFetch.mockReset();
  _resetAliasCache();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SSE 연결', () => {
  it('마운트 시 /map/activity-stream URL로 연결', () => {
    setupEmptyAlias();
    renderHook(() => useActivityStream());

    expect(MockEventSource.lastInstance).not.toBeNull();
    expect(MockEventSource.lastInstance!.url).toContain('/map/activity-stream');
  });

  it('언마운트 시 EventSource.close() 호출', () => {
    setupEmptyAlias();
    const { unmount } = renderHook(() => useActivityStream());
    const instance = MockEventSource.lastInstance!;

    unmount();
    expect(instance.close).toHaveBeenCalled();
  });
});

describe('heatmap:update 이벤트', () => {
  it('이벤트 수신 → activity 상태 업데이트', async () => {
    setupEmptyAlias();
    const { result } = renderHook(() => useActivityStream());
    await waitFor(() => MockEventSource.lastInstance !== null);

    await act(async () => {
      MockEventSource.lastInstance!.triggerEvent('heatmap:update', { '1111000': 5, '2222000': 3 });
    });

    expect(result.current).toEqual({ '1111000': 5, '2222000': 3 });
  });

  it('alias 병합: 동일 alias 코드의 count 합산', async () => {
    setupAlias({ '1111000': 'target', '1111001': 'target' });
    const { result } = renderHook(() => useActivityStream());
    await waitFor(() => MockEventSource.lastInstance !== null);

    await act(async () => {
      MockEventSource.lastInstance!.triggerEvent('heatmap:update', { '1111000': 2, '1111001': 3 });
    });

    await waitFor(() => result.current['target'] !== undefined);
    expect(result.current).toEqual({ target: 5 });
  });

  it('alias 없는 코드는 원본 코드 그대로', async () => {
    setupAlias({ '1111000': 'mapped' });
    const { result } = renderHook(() => useActivityStream());
    await waitFor(() => MockEventSource.lastInstance !== null);

    await act(async () => {
      MockEventSource.lastInstance!.triggerEvent('heatmap:update', { '1111000': 4, '9999000': 1 });
    });

    await waitFor(() => result.current['mapped'] !== undefined);
    expect(result.current).toEqual({ mapped: 4, '9999000': 1 });
  });
});

describe('오류 및 재연결 (지수 백오프)', () => {
  it('onerror → 1000ms 후 재연결', () => {
    setupEmptyAlias();
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
    setupEmptyAlias();
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

  it('백오프 상한: 30000ms 이상으로 늘어나지 않음', () => {
    setupEmptyAlias();
    renderHook(() => useActivityStream());

    // 6번 연속 오류로 상한에 도달시킴
    for (let i = 0; i < 6; i++) {
      act(() => { MockEventSource.lastInstance!.triggerError(); });
      act(() => { jest.advanceTimersByTime(30000); });
    }

    const countBefore = MockEventSource.callCount;
    act(() => { MockEventSource.lastInstance!.triggerError(); });
    act(() => { jest.advanceTimersByTime(30000); });

    expect(MockEventSource.callCount).toBe(countBefore + 1);
  });

  it('언마운트 후 오류 → 재연결 없음', () => {
    setupEmptyAlias();
    const { unmount } = renderHook(() => useActivityStream());
    const instance = MockEventSource.lastInstance!;
    unmount();

    const countAfterUnmount = MockEventSource.callCount;
    act(() => { instance.triggerError(); });
    act(() => { jest.advanceTimersByTime(60000); });

    expect(MockEventSource.callCount).toBe(countAfterUnmount);
  });

  it('성공적인 이벤트 수신 후 오류 → retryDelay 1000ms로 리셋', async () => {
    setupEmptyAlias();
    const { result } = renderHook(() => useActivityStream());

    // 1차 오류 → 재연결
    act(() => { MockEventSource.lastInstance!.triggerError(); });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(MockEventSource.callCount).toBe(2);

    // 성공적인 이벤트 수신 → retryDelay 리셋
    await act(async () => {
      MockEventSource.lastInstance!.triggerEvent('heatmap:update', { '1111': 1 });
    });
    await waitFor(() => result.current['1111'] !== undefined);

    // 다시 오류 → retryDelay 리셋됐으므로 1000ms 후 재연결
    act(() => { MockEventSource.lastInstance!.triggerError(); });
    act(() => { jest.advanceTimersByTime(999); });
    expect(MockEventSource.callCount).toBe(2);

    act(() => { jest.advanceTimersByTime(1); });
    expect(MockEventSource.callCount).toBe(3);
  });
});
