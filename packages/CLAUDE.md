# Packages — Shared db, redis, types

## Composition

- **`db/`** — Prisma layer.
  - `prisma/schema.prisma` — the canonical data model (users, sessions, creatures, watering, missions, friendships, pokes, community, neighborhoods, guide state, todos).
  - `prisma/migrations/` — migration history.
  - `src/index.ts` — re-exports the Prisma singleton, generated model types, and enums.
- **`redis/`** — Real-time cache layer.
  - Key namespaces and TTL constants in one module.
  - Cache helpers grouped by domain (session cache, regional active-user set, overlay session state).
  - ioredis singleton.
- **`types/`** — Shared types and Zod schemas.
  - Top-level files: domain type definitions, the SSE event union, cache payload shapes.
  - `schemas/` — Zod request / response schemas grouped by domain.
  - `src/index.ts` — re-exports everything.

## Core Rules

- **Dependency direction is one-way.** `types` is a leaf — it imports nothing from `db` or `redis`. `db` and `redis` may import from `types`. `apps/server` imports all three; `apps/web` imports `types` directly (and `db` via its own Next API routes).
- **`packages/types` is types only.** Interfaces, type aliases, Zod schemas. No value constants, no threshold arrays, no logic functions. System constants and domain logic belong in the owning package's module.
- **`db` storage conventions.** Timestamps stored in UTC; `date` columns are KST `YYYY-MM-DD` strings (the natural key for daily aggregation).
- **Schema changes are paired.** Any change to `schema.prisma` that affects a public shape requires synchronizing the corresponding `types` module (and `redis` cache shape if applicable) in the same change.
- **Key naming and TTL policy live in the redis package.** Session keys expire via TTL; active-state keys are purged by the midnight batch. Creature state is not cached separately — it lives in the session cache or the DB.
- **Zod schema placement.** Every API endpoint with a body or non-trivial response gets a schema in `types/schemas/`. The server validates against it; the web imports the inferred type from `@makeforest/types`.
- **The session cache payload is a composite shape** combining user, session, and creature state — it crosses DB model boundaries. See the shared types package.
- **The neighborhood model uses its administrative code as primary key.** All other models use a UUID primary key.

## References

- Product reference: `docs/PRODUCT.md`
- Migration patterns: `.claude/skills/database-migrations/`
- Authoring policy: `docs/CLAUDE_MD_POLICY.md`
