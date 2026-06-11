# Server — Express API & SSE

## Composition

- **`src/routes/`** — REST + SSE handlers grouped by resource. Most groups follow the pair `<name>.ts` (HTTP layer) + `<name>.logic.ts` (pure business logic), so logic is unit-testable without Express. Simple routes may keep logic inline.
- **Server-only domain logic** (evolution thresholds, per-user stage math) lives next to the routes that own it, not in `packages/types`.
- **SSE broadcasters** for region / user / activity targets live in a single module under `src/routes/`. Routes call them after a successful mutation.
- **`src/cron/`** — the KST midnight batch: auto-water → ABANDON active sessions → clear active-state cache keys.
- **`src/middleware/`** — internal auth middleware.
- **In-memory cache** for administrative district names + coordinates (24h TTL).
- **`src/index.ts`, `src/app.ts`** — bootstrap, `ZodError → 400` middleware, cron registration.
- **`src/__tests__/`, per-route `__tests__/`** — integration tests against a real DB; logic tests against the `.logic.ts` files.

## Core Rules

- **Zod is mandatory.** Every request body and query is validated through a Zod schema; never use type assertions. The bootstrap middleware converts `ZodError` to 400; do not catch it locally.
- **Time is server-authoritative.** Elapsed time accumulates on the server. Clients never decide.
- **KST handling.** Use the project's KST date helper for `date` columns. UTC conversion uses the KST offset, never UTC midnight (which is off by 9 hours).
- **Per-user dynamic timer settings.** Read the user's session row for timer length and segment count; fall back to the documented defaults only when the column is NULL. The historical defaults are not a system invariant.
- **One active session per user.** Creating a new session immediately ABANDONs any active session, clears the user's session cache, and removes them from the regional active-user set.
- **Watering + creature writes are transactional.** Always wrapped in a single transaction.
- **Redis is a cache; DB is the truth.** On any consistency doubt, re-read from Prisma. TTL and key policy live in the redis package; the midnight batch purges active-state keys.
- **SSE for real-time.** Routes call broadcasters directly after a successful mutation. No polling. Broadcasts are fire-and-forget — a broadcast failure must not block the response.
- **Route / logic split.** `<name>.ts` is HTTP (parse, route, status code, broadcast). `<name>.logic.ts` is pure functions returning data or throwing typed errors. Unit-test the logic file; integration-test the route file.
- **Auth boundary.** Express is not directly exposed to clients — all requests are proxied through Next.js API routes. Express validates the internal secret header on every request. Users without a registered neighborhood code cannot mutate.
- **Pessimistic locking on critical mutations.** Use row-level locking inside a transaction for session, watering, and friendship operations to prevent races.
- **Midnight batch (cron).** Registered in the Seoul timezone regardless of host TZ. Only active sessions are reconciled; paused sessions are left for the client to resolve on next session start.

## References

- Product reference: `docs/PRODUCT.md`
- Response schemas (Zod) and SSE event payload types: `packages/types/src/`
- Authoring policy: `docs/CLAUDE_MD_POLICY.md`
