# MakeForest

## Project Structure

```
apps/web      — Next.js frontend
apps/server   — Backend API server
packages/db   — Prisma schema & client
packages/redis — Redis client & utilities
packages/types — Shared type definitions
```

## Domain CLAUDE.md Paths

| Area | File |
|---|---|
| Layout, auth UI, onboarding | `apps/web/CLAUDE.md` |
| Left panel (my neighborhood / peeking) | `apps/web/components/panel/CLAUDE.md` |
| Map (pixel mode / forest mode) | `apps/web/components/map/CLAUDE.md` |
| Timer / watering API | `apps/server/CLAUDE.md` |
| Midnight batch / fossil / forest accumulation | `apps/server/src/cron/CLAUDE.md` |
| DB schema / data model | `packages/db/CLAUDE.md` |
| Redis real-time state | `packages/redis/CLAUDE.md` |

## Core Rules

### Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### Surgical Changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused. Don't remove pre-existing dead code unless asked.

Every changed line should trace directly to the user's request.

### Goal-Driven Execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"

For multi-step tasks, state a brief plan before starting:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

### Project-Specific Invariants

- **Time is server-authoritative** — never trust client time
- **Daily reset = KST 00:00**
- **Real-time targets**: heatmap, water toast, XP bar, creature evolution stage → SSE
- **Unauthenticated users**: map browsing only — no timer/watering; show login prompt inside panel (no popup)
