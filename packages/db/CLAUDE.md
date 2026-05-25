# DB — Schema & Data Model

## Core Entities

**User** — user profile, neighborhood (`dongCode`, `regionCode`), nickname, `todosPublic`

**Dong** — dong/eup/myeon level administrative unit, includes lat/lng coordinates

**DailySession** — per-user per-day cumulative focus time (`elapsedSec`) and daily water count (`waterCount`, max 12)

**FocusSession** — individual focus session log (RUNNING / PAUSED / COMPLETED / ABANDONED)
- Used for midnight split calculation and as the source of truth backing the Redis cache

**UserCreature** — permanent single creature per user (one per user, no date field)
- `@@unique([userId])` — one per user, never deleted or reset
- `stage` 0–9, `totalWaterCount` = lifetime cumulative waters
- Evolution thresholds: `[0, 12, 36, 72, 132, 216, 336, 504, 744, 1080]` (hardcoded in `water.logic.ts`)
- Daily water limit (12/day) is tracked separately via `DailySession.waterCount`

**WateringLog** — watering history (per user, dong, date)
- Used by midnight batch auto-water step to detect "users who watered today"

**PushSubscription** — web push subscription data

## Schema Design Principles

- All timestamp columns stored in UTC; KST conversion done in business logic
- Date columns (`date`) stored as KST "YYYY-MM-DD" strings
- Evolution thresholds hardcoded in `water.logic.ts` (Config table not implemented)
- `Creature` table removed — region-shared creature concept abolished, replaced by personal `UserCreature`

## Evolution Thresholds (cumulative waterCount)

| Stage | Cumulative needed | Additional needed |
|---|---|---|
| 0→1 | 12 | 12 |
| 1→2 | 36 | 24 |
| 2→3 | 72 | 36 |
| 3→4 | 132 | 60 |
| 4→5 | 216 | 84 |
| 5→6 | 336 | 120 |
| 6→7 | 504 | 168 |
| 7→8 | 744 | 240 |
| 8→9 | 1080 | 336 |

At maximum rate (12/day), stage 9 is reachable in ~90 days.
