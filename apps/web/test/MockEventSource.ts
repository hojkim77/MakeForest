/**
 * Shared MockEventSource for all SSE-related tests.
 *
 * Supports two usage patterns:
 *   - Simple: `MockEventSource.lastInstance` — for tests that open one SSE connection
 *   - Multi-URL: `MockEventSource.latestActivity()` / `.latestRegion()` / `.latestUserStream()`
 *     — for tests that open multiple connections (e.g. MainSseHandler)
 *
 * Call `MockEventSource.reset()` in beforeEach to clear state between tests.
 * Call `installMockEventSource()` once at module level to register as global.
 */
export class MockEventSource {
  static instances: MockEventSource[] = [];

  /** Last created instance — convenience for tests with a single SSE connection. */
  static get lastInstance(): MockEventSource | undefined {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }

  static latestActivity(): MockEventSource | undefined {
    return [...MockEventSource.instances]
      .reverse()
      .find((i) => i.url.includes('activity-stream') && !i.url.includes('regionCode'));
  }

  static latestRegion(): MockEventSource | undefined {
    return [...MockEventSource.instances].reverse().find((i) => i.url.includes('regionCode'));
  }

  static latestUserStream(): MockEventSource | undefined {
    return [...MockEventSource.instances].reverse().find((i) => i.url.includes('user-stream'));
  }

  static reset() {
    MockEventSource.instances = [];
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

/** Register MockEventSource as global.EventSource and reset instance list. */
export function installMockEventSource() {
  (global as unknown as Record<string, unknown>).EventSource = MockEventSource;
  MockEventSource.reset();
}
