# Web — Layout & Auth UI

## Folder Layout

### Rules

- **Page-local code**: components and hooks used only by a single route live under `app/<route>/_components/` and `app/<route>/_hooks/` (Next.js underscore-prefix opts them out of routing)
- **Shared code**: anything used across multiple routes lives under `shared/`

### Structure

```
app/
  (auth)/onboarding/_components/   ← onboarding-only UI
  (main)/_components/
    panel/                         ← panel components (main route only)
    map/                           ← map components (main route only)
  (main)/mypage/_components/       ← mypage-only UI
  welcome/_components/             ← welcome page-only UI

shared/
  components/
    ui/                            ← cross-route UI primitives (Icon, TopAppBar, WaterToast, CreatureSprite, ToastContainer)
    PushSubscriber.tsx
  hooks/                           ← cross-route custom hooks
  store/                           ← Zustand stores (used across multiple routes)
  lib/                             ← utilities, KST helpers (populate when first needed)
```

### Reserved (create only when first populated)

- `shared/types/` — cross-route TypeScript types
- `shared/constants/` — cross-route constants

## Design System

**tailwind.config.ts** — token registry only. No `@keyframes`, `@apply`, or CSS rules.

**globals.css** — CSS that Tailwind cannot generate, structured in 4 zones:
- `:root` — CSS variables (dynamic/computed values, `env()`)
- `@layer base` — HTML resets and third-party class overrides only
- `@layer components` — `@apply`-based multi-property abstractions
- `@layer utilities` — `@keyframes` + single-purpose custom utilities

**Token rules**
- No hardcoded hex. Use semantic tokens (`bg-primary`, `text-on-surface`, etc.)
- Brand colors (e.g. Kakao `#FEE500`): declare in `:root`, register in tailwind.config.ts
- z-index: semantic tokens only (`z-header`, `z-toast`, `z-guide-active`)
- Layout dimensions: reference CSS vars (`pt-topbar`, not `pt-[49px]`)
- Third-party lib props (e.g. recharts `fill`): extract as file-level constants

**Typography**
- `font-mono` — numbers, labels, buttons, nav
- `font-sans` — body copy, descriptions

**Component placement**
- `shared/components/ui/` — used by 2+ routes only; single-route components go in that route's `_components/`
- Icons: always use the `Icon` component, never inline SVG or bare `material-symbols-outlined` span
- Extract a shared component when the same UI pattern appears in 2+ places

## API Types

- All request/response types come from `@makeforest/types` — never redeclare API shapes as local `interface`/`type`
- Pattern: `import type { FocusStatsResType } from '@makeforest/types'` → `api.get<FocusStatsResType>(...)`
- When adding a new endpoint: define the schema in `packages/types/src/schemas/` first, then import

## Toast & Error Handling

**Toast** — use `toast.info(msg)` / `toast.success(msg)` / `toast.error(msg)` from `shared/lib/toast.ts` anywhere in the app.
- User-initiated actions that fail → always call `toast.error()`
- Background/SSE events → `toast.info()`
- Never show a toast for errors the user didn't trigger and can't act on

**Error handling**

Three patterns — pick the right one:

1. **User-initiated API call fails** → catch explicitly, call `toast.error()`, keep UI state intact
   ```ts
   try {
     await api.post(...)
   } catch {
     toast.error('...')
   }
   ```

2. **Background/fire-and-forget** → silent catch when failure must not interrupt local UX
   ```ts
   api.patch(complete).catch(() => {}) // timer keeps running regardless
   ```

3. **Unexpected render error** → `error.tsx` boundary per route (`app/error.tsx`, `app/(auth)/error.tsx`, `app/(main)/error.tsx`) — retry via Next.js `reset()`

Never swallow errors from user actions silently. Never show error toasts for background failures the user can't act on.

## B. Main Layout

- Fixed split: left panel + right map (ratio is fixed, not adjustable)
- On first load: zoom into the user's city/district forest + initialize panel to their neighborhood

## A. Auth UI / Onboarding

**Login**
- Social login only: Kakao / Google
- Unauthenticated user attempting timer/watering → show `LoginPrompt` inside the panel (no popup)
- `login/page.tsx` is RSC; interactive buttons are isolated in `login/_components/LoginButtons.tsx` (`'use client'`). Do not add `'use client'` back to the page itself.
- `(auth)/layout.tsx` injects `<link rel="preconnect">` for Kakao and Google OAuth origins. Keep preconnect here, not in root layout.

**Neighborhood setup (once)**
- Dedicated screen immediately after first login (Karrot-style flow)
- Request GPS permission → auto-detect → "Is this OO-dong?" confirmation UI
- GPS denied or detection failed → guidance text + auto-switch to text search mode
- One neighborhood only; change flow is not yet implemented
- `LocationSearchStep` is lazy-loaded via `dynamic()` — only fetched when user enters search step.
- `LocationSearchStep` has a module-level `searchCache` (Map) for deduplication and an `AbortController` ref to cancel in-flight requests on query change.

## H. Mypage UI

**Profile**: nickname + avatarUrl / neighborhood name / join date

**Stats (`StatsGrid`)** — parallel calls to `/stats/focus` and `/stats/rank`
- Total focus time (cumulative sum of DailySession.elapsedSec)
- Current streak / all-time longest streak
- Neighborhood contribution rank (neighborhoodRank / neighborhoodTotal)

**Weekly chart (`WeeklyChartSection`)** — calls `/stats/weekly`
- Bar chart of water counts for the last 4 weeks
- 4-week average water count

**My creature (`MyCreature`)** — calls `/user/me?userId=`
- Current UserCreature sprite (stage 0–9)
- Stage names: 씨앗 / 새싹 / 나무1 / 나무2 / 나무3 / 고목 / 노거수 / 정령수 / 신수 / 세계수
- Lifetime cumulative water count
- Stage progress badges (current stage highlighted)

**Unimplemented**
- Per-stage tree list
