---
name: tdd
description: MakeForest TDD guide — Pocock vertical-slice approach. Behavior-based tests through public interfaces. Referenced by developer when implementing features.
---

# TDD — MakeForest

## Philosophy

**Tests verify behavior through public interfaces, not implementation details.** Code can change entirely; tests shouldn't. A good test reads like a specification — "user can start timer after login" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

**Bad tests** are coupled to implementation: mocking internal collaborators, testing private methods, asserting on call counts. The warning sign: your test breaks when you refactor but behavior hasn't changed.

Mock only at **system boundaries**: external APIs, Prisma/DB, Redis, browser APIs (EventSource, WebSocket), and time. Never mock your own modules or internal business logic.

---

## Anti-Pattern: Horizontal Slicing

**DO NOT write all tests first, then all implementation.** This is horizontal slicing — treating RED as "write all tests" and GREEN as "write all code."

This produces bad tests:
- Tests written in bulk test imagined behavior, not actual behavior
- You test the shape of data structures rather than user-facing behavior
- Tests become insensitive to real changes

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4
  GREEN: impl1, impl2, impl3, impl4

RIGHT (vertical — tracer bullets):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
```

---

## Workflow

### 1. Plan

Before writing any code:
- Confirm which behaviors to test (not implementation steps)
- Identify system boundaries to mock
- List behaviors in priority order — you can't test everything

Ask: "What should users be able to do? Which behaviors are most critical?"

### 2. Tracer Bullet

Write ONE test that confirms ONE thing works end-to-end:

```
RED:   Write test for first behavior → confirm it fails
GREEN: Write minimal code to pass → confirm it passes
```

### 3. Incremental Loop

For each remaining behavior:

```
RED:   Write next test → fails
GREEN: Minimal code to pass → passes
```

Rules:
- One test at a time
- Only enough code to pass the current test
- Don't anticipate future tests

### 4. Refactor

After all tests pass:
- Extract duplication
- Deepen modules (move complexity behind simple interfaces)
- Run tests after each refactor step

**Never refactor while RED.** Get to GREEN first.

---

## Per-Cycle Checklist

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive an internal refactor
[ ] Code is minimal for this test only
[ ] No speculative features added
```

---

## Test File Locations

| Target | Location |
|--------|----------|
| Backend pure logic | `apps/server/src/routes/__tests__/*.logic.test.ts` |
| Zustand stores | `apps/web/store/__tests__/*.test.ts` |
| React components | `apps/web/components/**/__tests__/*.test.tsx` |
| Custom hooks | `apps/web/hooks/__tests__/*.test.ts` |

---

## What to Mock (System Boundaries Only)

| Boundary | Mock target | Why |
|----------|------------|-----|
| Auth session | `next-auth/react` → `useSession` | External library |
| HTTP | `global.fetch` | Network boundary |
| Browser SSE | `global.EventSource` | Browser API boundary |
| Time | `jest.useFakeTimers()` | Non-deterministic |
| Prisma | Extract to `.logic.ts` pure functions | DB boundary |

**Do NOT mock**: your own modules, Zustand internals, Express middleware you wrote, `*.logic.ts` functions.

---

## Backend Logic Tests

Extract business logic to pure functions in `routes/foo.logic.ts`. Test those — no DB, no Redis, no HTTP.

```typescript
// apps/server/src/routes/__tests__/water.logic.test.ts
import { calcPersonalStage, getKstDateString, checkDailyCapExceeded } from '../water.logic';

describe('creature stage progression', () => {
  it('starts at stage 0 with no waterings', () =>
    expect(calcPersonalStage(0)).toBe(0));
  it('advances to stage 1 at exactly 12 waterings', () =>
    expect(calcPersonalStage(12)).toBe(1));
  it('stays at stage 9 beyond the maximum threshold', () =>
    expect(calcPersonalStage(9999)).toBe(9));
});

describe('KST daily reset boundary', () => {
  it('UTC 14:59:59 is still the previous KST day', () =>
    expect(getKstDateString(new Date('2024-01-05T14:59:59Z'))).toBe('2024-01-05'));
  it('UTC 15:00:00 crosses into the next KST day', () =>
    expect(getKstDateString(new Date('2024-01-05T15:00:00Z'))).toBe('2024-01-06'));
});

describe('daily focus cap', () => {
  it('one second under 6 hours is not exceeded', () =>
    expect(checkDailyCapExceeded(21599)).toBe(false));
  it('exactly 6 hours triggers the cap', () =>
    expect(checkDailyCapExceeded(21600)).toBe(true));
});
```

Cover: boundary values (threshold ±1), upper/lower clamps, KST midnight crossings.

---

## Zustand Store Tests

Test through the store's public actions and state. `jest.useFakeTimers()` mocks the time boundary; `setState` is the store's public API for direct injection in tests.

```typescript
// apps/web/store/__tests__/timerStore.test.ts
import { useTimerStore } from '../timerStore';

beforeEach(() => {
  jest.useFakeTimers();
  useTimerStore.getState().reset();
});

afterEach(() => jest.useRealTimers());

describe('timer ticking', () => {
  it('elapsed time increases each second while running', () => {
    useTimerStore.getState().start();
    jest.advanceTimersByTime(3000);
    expect(useTimerStore.getState().elapsedSec).toBe(3);
  });
});

describe('watering progress reset', () => {
  it('clamps to zero when elapsed time is less than 30 minutes', () => {
    useTimerStore.setState({ elapsedSec: 500 });
    useTimerStore.getState().resetWaterProgress();
    expect(useTimerStore.getState().elapsedSec).toBe(0);
  });
});
```

---

## React Component Tests

Mock at system boundaries (fetch, auth session). Test observable user behavior, not internal state.

```typescript
// apps/web/components/panel/__tests__/TimerWaterSection.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TimerWaterSection } from '../TimerWaterSection';
import { useTimerStore, useWaterStore } from '@/store';

// Mock declarations — hoisted before imports
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
import { useSession } from 'next-auth/react';
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helpers
function withAuthenticatedUser() {
  mockUseSession.mockReturnValue({
    data: { user: { id: 'user1', name: 'Test', regionCode: '11' }, expires: '' },
    status: 'authenticated',
    update: jest.fn(),
  });
}

function setupFetch() {
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (url === '/api/sessions' && opts?.method === 'POST')
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ sessionId: 'sess-1' }) });
    if (url === '/api/water' && opts?.method === 'POST')
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ myWaterCount: 1, userCreature: { stage: 1, waterCount: 12 } }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  useTimerStore.getState().reset();
  useWaterStore.setState({ waterCount: 0, creatureStage: 0, growthPercent: 0, isWatering: false });
  jest.useFakeTimers();
});

afterEach(() => jest.useRealTimers());

describe('starting a focus session', () => {
  it('sends a session creation request when user clicks Start', async () => {
    withAuthenticatedUser();
    setupFetch();
    render(<TimerWaterSection myRegionCode="11" />);

    await waitFor(() => screen.getByText('Start'));
    await act(async () => { fireEvent.click(screen.getByText('Start')); });

    expect(mockFetch).toHaveBeenCalledWith('/api/sessions', expect.objectContaining({ method: 'POST' }));
  });
});
```

Prefer `data-testid` over element text for non-semantic elements. Use `await act(async () => {...})` for async event handlers.

---

## SSE Hook Tests

Mock `EventSource` at the browser API boundary. Test behavior: connection URL, cleanup on unmount, reconnect logic.

```typescript
// apps/web/hooks/__tests__/useActivityStream.test.ts
import { renderHook, act } from '@testing-library/react';
import { useActivityStream } from '@/hooks/useActivityStream';

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

  triggerError() { this.onerror?.(); }
}

(global as any).EventSource = MockEventSource;

beforeEach(() => {
  MockEventSource.lastInstance = null;
  MockEventSource.callCount = 0;
  jest.useFakeTimers();
});

afterEach(() => jest.useRealTimers());

describe('SSE connection lifecycle', () => {
  it('connects to the activity stream endpoint on mount', () => {
    renderHook(() => useActivityStream());
    expect(MockEventSource.lastInstance!.url).toContain('/map/activity-stream');
  });

  it('closes the connection when the component unmounts', () => {
    const { unmount } = renderHook(() => useActivityStream());
    const instance = MockEventSource.lastInstance!;
    unmount();
    expect(instance.close).toHaveBeenCalled();
  });

  it('reconnects after 1 second on connection error', () => {
    renderHook(() => useActivityStream());
    act(() => { MockEventSource.lastInstance!.triggerError(); });
    act(() => { jest.advanceTimersByTime(999); });
    expect(MockEventSource.callCount).toBe(1);
    act(() => { jest.advanceTimersByTime(1); });
    expect(MockEventSource.callCount).toBe(2);
  });
});
```

---

## What NOT to Test

- Prisma / Redis calls directly — extract to `.logic.ts` and test pure functions
- Full route handlers (Express req/res) — test the `.logic.ts` extraction
- Styles, layout, pixel matching
- `console.error` output — assert the resulting error state instead
