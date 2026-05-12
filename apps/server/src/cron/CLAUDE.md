# Cron — Midnight Batch (KST 00:00)

## Execution Order (implemented)

1. **Auto-water unwatered users** — for yesterday (KST), users whose FocusSession total ≥ 7200s AND `DailySession.waterCount = 0` receive 1 automatic water (WateringLog created + UserCreature upsert + `calcPersonalStage`)
   - Completed sessions: elapsed = `endedAt - startedAt`
   - RUNNING sessions at midnight: elapsed = `nextMidnightUtc - startedAt` (self-contained up to day boundary)
2. **ABANDON all RUNNING sessions** — DB `updateMany` (`status: RUNNING` → `ABANDONED`, `endedAt` = now)
   - PAUSED sessions are not touched here (handled by the client when a new session starts)
3. **Clean up Redis active sessions** — delete each dongActive Set entry, derive active dongCodes from the heatmap → delete regionActive keys, delete the entire heatmapDong hash, broadcast `heatmap:update` SSE with `{}`
4. **Create Fossils** — for each user who has a WateringLog entry for yesterday (KST), upsert a Fossil. Coordinates from `User.dongCode` → Dong lat/lng → `toPixel()` + ±3px jitter. `creatureType` = (day-of-year + userId hash) % 14

## Creature Unit

- **Per user (userId)** — `UserCreature.@@unique([userId])` (no date field, single permanent record)
- The old region-shared `Creature` table has been removed

## Fossil Creation Rules

- Users with a WateringLog entry for that date are eligible for Fossil creation
- A Fossil is created even if stage = 0, as long as there is a WateringLog entry (stage is a snapshot of UserCreature.stage at fossil time)
- If `User.dongCode` is null, that user is skipped
- `Fossil.@@unique([userId, date])` — one per user per day; on duplicate run, only `stage` is updated

## Evolution Thresholds (cumulative waterCount)

`PERSONAL_STAGE_THRESHOLDS = [0, 12, 36, 72, 132, 216, 336, 504, 744, 1080]` — hardcoded in `water.logic.ts` (10 stages)

## Date Calculation Note

When `autoWaterUnwatered` queries sessions for yesterday's KST date:
```typescript
// Correct: convert KST 00:00 to UTC
const kstMidnightUtc = new Date(`${date}T00:00:00+09:00`);
// Wrong: ${date}T15:00:00Z = KST midnight of the *next* day → returns 0 results
```

## Unimplemented

- Request queue during midnight batch execution (race condition currently allowed)
- Session-splitting for RUNNING sessions that started before yesterday but cross into yesterday
- Weather/season-based `creatureType` selection
- Evolution threshold Config table

## Manual Trigger (for testing)

`POST /test/run-midnight` (only in `NODE_ENV=test`) — calls `runMidnightBatch()` directly
