# Redis — Real-time State Caching Rules

## What Gets Stored

**Active session cache**
- key: `session:{sessionId}`
- value: `ActiveSessionCache` — full JSON with these fields:
  ```
  userId, dongCode, startedAt, durationSec, todos, status
  nickname, pixelX, pixelY           // for ForestMap overlay display
  waterCount, creatureStage          // updated on each water
  todosPublic                        // privacy control
  ```
- TTL: **25 hours** (`SESSION_TTL_SECONDS = 90000`) — midnight batch abandons RUNNING sessions, but TTL also exists as a safety net
- Written on `POST /sessions`; updated on water, pause, and resume
- After midnight batch marks RUNNING sessions as ABANDONED, the `session:` keys expire via TTL (no explicit delete)

**Per-dong active session set**
- key: `dong:{dongCode}:active`
- value: Set of sessionIds currently RUNNING in that dong
- Used for heatmap calculation and `users:overlay` assembly

**Per-city/district active session set**
- key: `region:{encodeURIComponent(regionCode)}:active`
- value: Set of active sessionIds in that city/district
- Used in `/map/activity-stream` SSE for user overlay assembly

**Heatmap hash**
- key: `heatmap:dong`
- value: `{ [dongCode]: activeCount }` hash
- Source data for the `heatmap:update` SSE event

## Rules

- Redis is a real-time read cache — the DB is always the source of truth
- Session cache TTL = 25 hours; midnight batch explicitly deletes dongActive / regionActive / heatmapDong; session keys expire via TTL
- No `creature:stage` key — individual creature state is managed through `waterCount` / `creatureStage` fields inside the session cache
- After midnight batch: entire heatmapDong hash deleted + dongActive / regionActive sets cleaned up
