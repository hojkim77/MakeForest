---
name: tdd
description: MakeForest TDD guide — always reference when developing or modifying features. Includes backend logic unit tests, Zustand store tests, component tests, and hook test patterns.
---

# TDD — MakeForest

## Principles

Order for feature development and modification:

1. **Failing test first** — write the test before implementing and confirm it fails
2. **Implement** — write only the minimum code to make the test pass
3. **Verify** — run `yarn test`, confirm all tests pass

For bug fixes:

- Write a test that reproduces the bug → confirm it fails → fix → confirm it passes

---

## Test File Locations

| Target               | Location                                           |
| -------------------- | -------------------------------------------------- |
| Backend pure logic   | `apps/server/src/routes/__tests__/*.logic.test.ts` |
| Zustand stores       | `apps/web/store/__tests__/*.test.ts`               |
| React components     | `apps/web/components/**/__tests__/*.test.tsx`      |
| Custom hooks         | `apps/web/hooks/__tests__/*.test.ts`               |

---

## Backend Logic Unit Tests

Test pure functions only. No external dependencies (DB, Redis).

```typescript
// apps/server/src/routes/__tests__/water.logic.test.ts
import { calcPersonalStage, getKstDateString, checkDailyCapExceeded } from '../water.logic';

describe('calcPersonalStage', () => {
  it('0 → stage 0', () => expect(calcPersonalStage(0)).toBe(0));
  it('12 → stage 1 (exactly at threshold)', () => expect(calcPersonalStage(12)).toBe(1));
  it('9999 → stage 9 (upper clamp)', () => expect(calcPersonalStage(9999)).toBe(9));
});

describe('getKstDateString — KST midnight boundary', () => {
  it('UTC 14:59:59 = KST 23:59:59 → same day', () => {
    expect(getKstDateString(new Date('2024-01-05T14:59:59Z'))).toBe('2024-01-05');
  });
  it('UTC 15:00:00 = KST 00:00:00 → next day', () => {
    expect(getKstDateString(new Date('2024-01-05T15:00:00Z'))).toBe('2024-01-06');
  });
});

describe('checkDailyCapExceeded — 6 hours (21600s)', () => {
  it('21599s → not exceeded', () => expect(checkDailyCapExceeded(21599)).toBe(false));
  it('21600s → exceeded (exactly at boundary)', () => expect(checkDailyCapExceeded(21600)).toBe(true));
});
```

**Naming conventions**:

- `describe`: `'functionName — description'`
- `it`: `'input → expected output (condition note)'`
- Must cover: boundary values (threshold ±1), upper/lower clamps, date boundaries (KST midnight)

---

## Zustand Store Tests

```typescript
// apps/web/store/__tests__/timerStore.test.ts
import { useTimerStore } from '../timerStore';

beforeEach(() => {
  jest.useFakeTimers();
  useTimerStore.getState().reset(); // reset before each test
});

afterEach(() => {
  jest.useRealTimers();
});

describe('start / tick', () => {
  it('elapsedSec increments every second after start', () => {
    useTimerStore.getState().start();
    jest.advanceTimersByTime(3000);
    expect(useTimerStore.getState().elapsedSec).toBe(3);
  });
});

describe('resetWaterProgress — deduct 30 min (1800s)', () => {
  it('elapsedSec=500 → 0 (negative clamp)', () => {
    useTimerStore.setState({ elapsedSec: 500 }); // inject state directly
    useTimerStore.getState().resetWaterProgress();
    expect(useTimerStore.getState().elapsedSec).toBe(0);
  });
});
```

**Key patterns**:

- `beforeEach`: `jest.useFakeTimers()` + `store.getState().reset()`
- `afterEach`: `jest.useRealTimers()`
- Timer control: `jest.advanceTimersByTime(ms)`
- Direct state injection: `useStore.setState({ field: value })`
- Reading state outside hooks: `useStore.getState().field`

---

## React Component Tests

```typescript
// apps/web/components/panel/__tests__/TimerWaterSection.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TimerWaterSection } from '../TimerWaterSection';
import { useTimerStore, useWaterStore } from '@/store';

// ── Mock declarations (top of file) ──────────────────────────────────────────
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
import { useSession } from 'next-auth/react';
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

jest.mock('@/store/mapStore', () => ({
  useMapStore: (sel: (s: typeof mockMapState) => unknown) => sel(mockMapState),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Helper functions ──────────────────────────────────────────────────────────
function loginSession() {
  mockUseSession.mockReturnValue({
    data: { user: { id: 'user1', name: 'Test', regionCode: '11' }, expires: '' },
    status: 'authenticated',
    update: jest.fn(),
  });
}

function setupDefaultFetch() {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (url === '/api/sessions' && opts?.method === 'POST')
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ sessionId: 'sess-1' }) });
    if (url === '/api/water' && opts?.method === 'POST')
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ myWaterCount: 1, userCreature: { stage: 1, waterCount: 12 } }),
      });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

// ── beforeEach / afterEach ────────────────────────────────────────────────────
beforeEach(() => {
  mockFetch.mockReset();
  useTimerStore.getState().reset();
  useWaterStore.setState({ waterCount: 0, creatureStage: 0, growthPercent: 0, isWatering: false });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Timer start', () => {
  it('click start button → POST /api/sessions + sessionId saved', async () => {
    loginSession();
    setupDefaultFetch();
    render(<TimerWaterSection myRegionCode="11" />);

    await waitFor(() => screen.getByText('Start'));
    await act(async () => { fireEvent.click(screen.getByText('Start')); });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(useTimerStore.getState().sessionId).toBe('sess-1');
  });
});
```

**Key patterns**:

- Mock declarations: `jest.mock(...)` at top of file — hoisted before `import`
- Helper functions: separate `loginSession()`, `setupDefaultFetch()`, `render*()` helpers
- `beforeEach`: `mockFetch.mockReset()` + reset all stores
- Async events: `await act(async () => { fireEvent.click(...) })`
- Render assertions: `await waitFor(() => screen.getBy...)`
- Use `data-testid`: prefer `getByTestId('water-btn')` over meaningless button text

---

## Custom Hook Tests (with Browser APIs)

Replace browser APIs (`EventSource`, `WebSocket`, etc.) with mock classes.

```typescript
// apps/web/hooks/__tests__/useActivityStream.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useActivityStream } from '@/hooks/useActivityStream';

// ── Mock class ────────────────────────────────────────────────────────────────
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

// ── Tests ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  MockEventSource.lastInstance = null;
  MockEventSource.callCount = 0;
  jest.useFakeTimers();
});

afterEach(() => jest.useRealTimers());

describe('SSE connection', () => {
  it('connects to correct URL on mount', () => {
    renderHook(() => useActivityStream());
    expect(MockEventSource.lastInstance!.url).toContain('/map/activity-stream');
  });

  it('calls EventSource.close() on unmount', () => {
    const { unmount } = renderHook(() => useActivityStream());
    const instance = MockEventSource.lastInstance!;
    unmount();
    expect(instance.close).toHaveBeenCalled();
  });
});

describe('exponential backoff reconnect', () => {
  it('onerror → reconnects after 1000ms', () => {
    renderHook(() => useActivityStream());
    act(() => {
      MockEventSource.lastInstance!.triggerError();
    });
    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(MockEventSource.callCount).toBe(1);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(MockEventSource.callCount).toBe(2);
  });
});
```

---

## What NOT to Test

- Direct Prisma / Redis calls — integration test territory, excluded from unit tests
- Full route handlers (Express req/res) — extract logic to `.logic.ts` for unit testing
- Styles, layout, pixel matching — verify behavior only
- `console.error` logs — assert the error state itself
