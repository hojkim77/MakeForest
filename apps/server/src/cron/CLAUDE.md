# Cron — Midnight Batch (KST 00:00)

## Execution Order (implemented)

1. **Auto-water unwatered users** — for yesterday (KST), users whose FocusSession total ≥ 7200s AND `DailySession.waterCount = 0` receive 1 automatic water (WateringLog created + UserCreature upsert + `calcPersonalStage`)
   - Accumulated elapsed: `FocusSession.totalElapsedSec` (server-managed)
   - RUNNING sessions at midnight: add `nextMidnightUtc - startedAt` (`startedAt` is updated on each resume)
2. **ABANDON all RUNNING sessions** — DB `updateMany` (`status: RUNNING` → `ABANDONED`)
   - PAUSED sessions are not touched here (handled by the client when a new session starts)
3. **Clean up Redis active sessions** — delete each dongActive Set entry, derive active dongCodes from the heatmap → delete the entire heatmapDong hash, broadcast `heatmap:update` SSE with `{}`

## Creature Unit

- **Per user (userId)** — `UserCreature.@@unique([userId])` (no date field, single permanent record)
- The old region-shared `Creature` table has been removed

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
- Evolution threshold Config table

## Manual Trigger (for testing)

`POST /test/run-midnight` (only in `NODE_ENV=test` or `LOAD_TEST=1`) — calls `runMidnightBatch()` directly
