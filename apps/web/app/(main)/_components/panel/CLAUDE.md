# Panel — Left Panel Spec (C)

## Component Tree (Panel.tsx)

Render order:
1. `WaterStoreInitializer` — injects server-fetched initial waterCount/creatureStage/growthPercent into zustand store (no UI)
2. `PeekingBanner` — shows "go back to my neighborhood" button when in peeking mode
3. `SloganSection` — service slogan + currently selected neighborhood name
4. `WaterToast` — real-time watering toast
5. `CreatureSection` — user's creature sprite + stage name (logged-in only)
6. `NeighborhoodStats` — personal growth rate gauge bar (logged-in only)
7. `TimerWaterSection` + `TaskList` — timer/watering/todos (logged-in only)
8. `LoginPrompt` — login prompt for unauthenticated users (unauthenticated only)

## My Neighborhood Mode (default)

**Top**
- Service slogan + neighborhood name
- Water toast: real-time "OOO watered 💧" (fires whenever anyone in the neighborhood waters)
- Today's creature pixel image (reflects `creatureStage` from waterStore in real time)
- Stage name: 씨앗 / 새싹 / 나무1 / 나무2 / 나무3 / 고목 / 노거수 / 정령수 / 신수 / 세계수

**Middle — Personal Growth Rate**
- Personal growth rate gauge bar (`growthPercent` = progress toward next creature stage, based on `UserCreature.totalWaterCount`)
- Neighborhood name + growth rate % text

**Bottom — Focus/Watering Combined Section (`TimerWaterSection`)**
- 12-segment gauge bar (30 min = 1 segment, 6 hours = 100%; water color + flowing animation)
- Today's total focus time text: `Xh Xm / 6h`
- Timer display (MM:SS)
- Two buttons:
  - Left: state button — IDLE: "시작" / RUNNING: "중지" / PAUSED: "재개"
  - Right: water button — active when (`RUNNING` OR (`PAUSED` && `autoPaused`)) AND `elapsedSec >= 1800` (max 12/day)
- `autoPaused` state: speech bubble shown above the gauge on 30-min auto-pause; resume button disabled; water button remains active
- Task list (`TaskList`) — free-text input, add/toggle (not required, no forced entry before timer start)

**Unimplemented**
- Neighborhood search input (`NeighborhoodSearch` component exists but is not rendered in `Panel.tsx`)

## Peeking Mode (when another neighborhood is selected)

- `PeekingBanner` pinned at top: "내 동네로 돌아가기" button
- `SloganSection` reflects the selected neighborhood name
- `TimerWaterSection`, `TaskList` — return null when `isPeeking` is true (hidden)
- Neighborhood search input not implemented

## Panel Switch Triggers

- Select a neighborhood in the search input → panel + map switch together
- Click a neighborhood pixel on the map → panel + map switch together
- Both triggers use the same state transition path

## Toast 책임 구분

- `WaterToast`: SSE `water:toast` 이벤트 전용 (다른 사용자의 물주기 알림). 중앙 상단(`top-20 left-1/2 z-[60]`)에 렌더링.
- 범용 `ToastContainer` (`shared/components/ui/ToastContainer.tsx`): 에러/성공/정보 피드백. 우상단(`top-4 right-4 z-[70]`). `toast.error()` 등으로 호출.

## Real-time Subscriptions

- Water toast (SSE `water:toast`)
- Creature evolution stage — reflected in `CreatureSection` via waterStore updates
- Growth rate gauge — reflected via waterStore `growthPercent` updates
