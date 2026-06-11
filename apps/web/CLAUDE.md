# Web — Next.js Frontend

## Composition

- **Route groups**
  - `app/(auth)/` — login + onboarding (neighborhood selection)
  - `app/(main)/` — the authenticated app shell (left panel + right map)
  - `app/(main)/mypage/` — stats, streak, weekly chart, creature dashboard
  - `app/(main)/community/` — community feed, regional ranking
  - `app/welcome/` — unauthenticated landing
- **`app/(main)/_components/`** — page-local components grouped by surface: panel, map, guide/onboarding, friends. The shell layout and a single SSE entry point live at this level.
- **`shared/`**
  - `components/ui/` — cross-route UI primitives
  - `hooks/mutations/`, `hooks/queries/` — TanStack Query wrappers per resource
  - `store/` — Zustand slices for ephemeral UI state
  - `lib/` — HTTP client, URL constants, cache keys, SSE pool, centralized error handler
  - `utils/` — formatting, KST date helpers, neighborhood code helpers, creature display helpers
- Next.js API routes under `app/api/` are thin proxies to `apps/server`.

## Core Rules

- **Page-local code stays page-local.** Components and hooks used by a single route live under that route's `_components/` or `_hooks/`. Do not promote into `shared/` unless ≥ 2 routes need it.
- **API types come from `@makeforest/types`.** Never redeclare API request / response shapes locally.
- **Semantic tokens only.** Use Tailwind tokens defined in `globals.css` and registered in `tailwind.config.ts`. No inline hex, no arbitrary `z-[NNN]`, no arbitrary pixel offsets. Brand colors and runtime values go through CSS variables.
- **Icons go through a single shared icon component.** No inline SVG, no bare material-symbols spans.
- **Unauthenticated users see an inline prompt in the panel.** Never a popup.
- **SSE is centralized.** A single shell component manages all SSE subscriptions; route components observe Zustand stores and do not open their own `EventSource`.
- **API and cache plumbing is centralized.** All HTTP calls go through the shared API client; cache keys and URL constants come from the shared lib.
- **Toasts go through the centralized toast API.** User-initiated failures → always error toast. Background failures the user can't act on → silent.
- **Map** — mode switch is driven by clicks, not zoom. The user overlay is SSE-driven (no polling).
- **Initial data is fetched server-side** and passed as props to client components. Client components use TanStack Query for subsequent updates, not initial loads.
- **Zustand slices hold ephemeral UI state only.** They are not persisted to the server. Do not store server-canonical data in slices.
- **Mutations follow TanStack Query's optimistic update pattern.** `onMutate` → `onError` rollback → `onSettled` invalidation. Errors go through the centralized API error handler.

## References

- Product reference: `docs/PRODUCT.md`
- Types / Zod schemas: `packages/types/src/`
- Patterns: `.claude/skills/react-best-practices/`
- Authoring policy: `docs/CLAUDE_MD_POLICY.md`
