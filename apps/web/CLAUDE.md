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
    ui/                            ← cross-route UI primitives (Icon, TopAppBar, WaterToast, CreatureSprite)
    PushSubscriber.tsx
  hooks/                           ← cross-route custom hooks
  store/                           ← Zustand stores (used across multiple routes)
  lib/                             ← utilities, KST helpers (populate when first needed)
```

### Reserved (create only when first populated)

- `shared/types/` — cross-route TypeScript types
- `shared/constants/` — cross-route constants

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
- Creature collection: Fossil calendar/grid for days the user watered (Fossil table exists, UI not built)
- Per-stage tree list
