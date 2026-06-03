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
| Route integration | `apps/server/src/routes/__tests__/*.integration.test.ts` |
| Zustand stores | `apps/web/shared/store/__tests__/*.test.ts` |
| React components | `apps/web/**/__tests__/<Component>.test.tsx` |
| Custom hooks | `apps/web/shared/hooks/**/__tests__/<hook>.test.ts` |

---

## What to Mock (System Boundaries Only)

| Boundary | Mock target | Why |
|----------|------------|-----|
| Auth session | `next-auth/react` → `useSession` | External library |
| HTTP | `global.fetch` | Network boundary |
| Browser SSE | `global.EventSource` | Browser API boundary |
| Time | `jest.useFakeTimers()` | Non-deterministic |
| Prisma (unit tests) | Extract to `.logic.ts` pure functions | DB boundary — unit tests never hit DB |

**Do NOT mock**: your own modules, Zustand internals, Express middleware you wrote, `*.logic.ts` functions.

---

## Integration Tests (Route Handlers)

Use when: adding a new route, or changing a route's DB-write behavior.

Real: Express `app`, Prisma + testcontainers Postgres, our middleware, our `.logic.ts` modules.
Mock: Redis (`ioredis-mock` by default), OAuth/external APIs.
File: `apps/server/src/routes/__tests__/<route>.integration.test.ts`
Prerequisite: `app.ts` export split + `testApp.ts` helper (Phase A infra).

Required cases per route:
- happy path
- auth/permission denied
- validation failure (400)
- domain limit / conflict (409) — if applicable
- concurrent race — N parallel requests → exactly the limit passes

---

## Backend Logic Tests

Extract business logic to pure functions in `routes/foo.logic.ts`. Test those — no DB, no Redis, no HTTP.

Cover: boundary values (threshold ±1), upper/lower clamps, KST midnight crossings.

---

## Three-Layer Decision Criteria

### Unit

| | |
|---|---|
| Purpose | Catch regressions in business rules, calculations, and validation |
| Surface | Single pure function / Zustand public action+state / single component / single hook |
| Real | All our own modules — `.logic.ts`, stores, components |
| Mock | `fetch`, `EventSource`, `next-auth/react`, `next/navigation`, `jest.useFakeTimers()` |
| File location | Server: `src/routes/__tests__/<name>.logic.test.ts` · Web store: `shared/store/__tests__/<store>.test.ts` · Web component: `**/__tests__/<Component>.test.tsx` · Web hook: `shared/hooks/**/__tests__/<hook>.test.ts` |
| Time target | < 1s per file |
| Breaks when | A rule changed, or the test is coupled to implementation |

**Server pattern**: Extract all non-DB, non-HTTP computation from route handlers into `<name>.logic.ts`. The route itself stays a thin wrapper.

**Web pattern**: Zustand — inject via `setState` → call public action → read state. Components — prefer `data-testid` for non-semantic elements.

### Integration

| | |
|---|---|
| Purpose | Catch regressions in the route handler + DB + middleware composition. Verify concurrency, idempotency, and transaction boundaries |
| Surface | `supertest(app).method(path)` → assert both response and DB state |
| Real | Express app, Prisma + testcontainers Postgres, our middleware, our `.logic.ts` modules |
| Mock | Redis (`ioredis-mock`), OAuth and external APIs |
| File location | `apps/server/src/routes/__tests__/<route>.integration.test.ts` |
| Time target | < 10s per file |
| Breaks when | Route contract, DB constraint, or concurrency guard is violated |

### E2E

| | |
|---|---|
| Purpose | Catch regressions in core user journeys end-to-end: browser → Next.js → Server → DB |
| Surface | Playwright browser automation against real Next.js, real server, real DB |
| Real | Everything |
| Mock | OAuth only — `/test/login` endpoint (guarded by `LOAD_TEST=1`) issues a session token and injects it as a cookie |
| File location | `apps/web/e2e/<scenario>.spec.ts` |
| Time target | < 60s per file, < 5min total suite |
| Breaks when | Any layer in the user journey breaks — route, UI, auth, or DB |

**Cover with E2E**: journeys that cross multiple domains, scenarios where auth state is decisive, mobile viewport regressions.

**Do NOT cover with E2E** (unit/integration responsibility): single-component renders, single-route responses, business rule branches.

---

## Decision Tree — What to Write

```
1) New business rule (calculation / threshold / state decision)?
   → Unit: extract to <name>.logic.ts + write <name>.logic.test.ts

2) New HTTP route or a new DB-write branch in an existing route?
   → Integration: <route>.integration.test.ts
   → Cases: happy path + auth denied + validation failure (400) + concurrency/idempotency (if applicable)

3) New UI branch or screen state?
   → Component unit: __tests__/<Component>.test.tsx

4) New fork in a core user journey?
   → E2E: apps/web/e2e/<scenario>.spec.ts (optional, one scenario)
```

You do not need all three layers every time. Only add tests to the layers that are touched.

---

## CI Execution

| Stage | What | When |
|---|---|---|
| unit | `turbo run test:unit` (web + server) | every PR |
| integration | `yarn workspace @makeforest/server test:integration` | every PR |
| e2e | `playwright test` | `main` merge or PRs with the `e2e` label only |

---

## PR Checklist

```
- [ ] New business rule → .logic.test.ts added
- [ ] New route or write branch → integration test added
- [ ] New UI branch → component test added
- [ ] New user journey fork (optional) → E2E scenario added
- [ ] Tests for removed behavior are deleted (not skipped)
- [ ] No own modules mocked with jest.mock()
- [ ] Test names read as "what happens", not "what the code does"
```

---

## What NOT to Test

- Prisma / Redis calls directly in unit tests — extract to `.logic.ts` and test pure functions
- Route handlers with mocked Express req/res — extract to `.logic.ts`; use supertest for handler-level behavior
- Styles, layout, pixel matching
- `console.error` output — assert the resulting error state instead
