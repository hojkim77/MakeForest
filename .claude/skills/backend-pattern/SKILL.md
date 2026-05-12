---
name: backend
description: MakeForest backend architecture patterns — Express routing, Prisma transactions, Redis session caching, SSE broadcast, Cron batch, KST date handling.
---

# MakeForest Backend Patterns

## When to Activate

- Adding or modifying Express routes (sessions, water, stats, map, creature)
- Writing Prisma transactions or batch updates
- Manipulating Redis session cache or heatmap
- Adding SSE event types or changing broadcast logic
- Adding steps to the midnight batch (midnight.ts)
- Writing business logic based on KST dates

## Directory Structure

```
routes/foo.ts        — Express router (HTTP handling, Redis/SSE sync)
routes/foo.logic.ts  — Pure business logic (date calculations, stage decisions, etc.)
routes/__tests__/    — Unit tests
middleware/          — Express middleware (currently: auth.ts)
cron/                — node-cron batch registration and execution
```

## Routing Layer

### Public vs. Protected Endpoints

```typescript
// Public: read-only (no auth required)
app.use('/sse', sseRouter);
app.use('/map', mapRouter);
app.use('/stats', statsRouter);
app.use('/user', userRouter);
app.use('/creature', creatureRouter);

// Protected: writes (validates X-Internal-Secret)
app.use('/sessions', requireInternalAuth, sessionsRouter);
app.use('/water', requireInternalAuth, waterRouter);
```

Protected endpoints are proxied from the Next.js API layer after verifying user session.
User info (`userId`, `dongCode`) is extracted from the request body — no JWT parsing.

### Auth Middleware

```typescript
// middleware/auth.ts
export function requireInternalAuth(req, res, next) {
  if (!INTERNAL_SECRET) return next(); // dev: passthrough
  if (req.headers['x-internal-secret'] !== INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
```

## Error Handling

No custom error classes. Return HTTP status code + `{ error: string }` directly.

```typescript
// 400: missing required input
if (!userId || !dongCode) {
  return res.status(400).json({ error: 'userId and dongCode required' });
}

// 404: resource not found
if (!session) return res.status(404).json({ error: 'Not found' });

// 409: business rule violation
if (dailyWaterCount >= 12) {
  return res.status(409).json({ error: 'Daily watering limit reached.' });
}

// 500: server error
catch (err) {
  console.error('[water] POST error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}
```

Error logging format: `console.error('[module] description:', err)`.

## Async Work Pattern (void pattern)

Return response first; Redis/SSE sync runs without blocking the response.

```typescript
// DB write → immediate response
const session = await prisma.focusSession.create({ data: { ... } });
res.json({ sessionId: session.id, startedAt: session.startedAt });

// Post-response: Redis + SSE async processing
void (async () => {
  await setSession(session.id, { ... });
  await addActiveDong(dongCode, session.id);
  const activeCount = await getDongActiveCount(dongCode);
  await redis.hset(RedisKeys.heatmapDong(), { [dongCode]: activeCount });
  broadcastHeatmap(heatmapData);
  const users = await buildRegionUsers(regionCode);
  broadcastToRegion(regionCode, { type: 'dong:users', data: { regionCode, users } });
})();
```

Run multiple independent queries in parallel with `Promise.all`.

```typescript
const [user, dong, creature] = await Promise.all([
  prisma.user.findUnique({ where: { id: userId } }),
  prisma.dong.findUnique({ where: { code: dongCode } }),
  prisma.userCreature.findUnique({ where: { userId } }),
]);
```

## Prisma Transactions

All multi-writes requiring atomicity go inside `$transaction`.

```typescript
await prisma.$transaction(async (tx) => {
  await tx.wateringLog.create({ data: { userId, dongCode, date: today } });

  const existing = await tx.userCreature.findUnique({ where: { userId } });
  const newWaterCount = (existing?.waterCount ?? 0) + 1;
  const newStage = calcPersonalStage(newWaterCount);

  await tx.userCreature.upsert({
    where: { userId },
    update: { waterCount: newWaterCount, stage: newStage },
    create: { userId, waterCount: newWaterCount, stage: newStage },
  });

  await tx.dailySession.upsert({
    where: { userId_date: { userId, date: today } },
    update: { waterCount: { increment: 1 }, elapsedSec },
    create: { userId, date: today, elapsedSec, waterCount: 1 },
  });
});
```

Batch updates (midnight batch, etc.):

```typescript
await prisma.focusSession.updateMany({
  where: { status: 'RUNNING' },
  data: { status: 'ABANDONED', endedAt: new Date() },
});
```

## Redis Patterns

### Key Naming Convention

```typescript
// packages/redis/src/keys.ts
export const RedisKeys = {
  session: (sessionId: string) => `session:${sessionId}`,
  dongActive: (dongCode: string) => `dong:${dongCode}:active`,
  regionActive: (regionCode: string) => `region:${encodeURIComponent(regionCode)}:active`,
  heatmapDong: () => `heatmap:dong`,
} as const;

const SESSION_TTL_SECONDS = 6 * 60 * 60; // 6 hours
```

Always register new Redis keys in `RedisKeys`.

### Active Session Management Pattern

```typescript
// dong/region active session Sets
await addActiveDong(dongCode, sessionId); // SADD
await removeActiveDong(dongCode, sessionId); // SREM
await getDongActiveCount(dongCode); // SCARD

await addActiveRegion(regionCode, sessionId);
await removeActiveRegion(regionCode, sessionId);

// Heatmap Hash (dongCode → count)
await redis.hset(RedisKeys.heatmapDong(), { [dongCode]: activeCount });
const raw = await redis.hgetall(RedisKeys.heatmapDong());
```

### In-Flight Coalescing + Memory Cache Pattern

Apply to expensive aggregate queries (full active user list, etc.).

```typescript
let pending: Promise<Result[]> | null = null;
let cache: Result[] = [];
let cachedAt = 0;

async function getCached(): Promise<Result[]> {
  if (Date.now() - cachedAt < 5_000) return cache; // 5s cache
  if (!pending) {
    pending = buildExpensiveResult()
      .then((r) => {
        cache = r;
        cachedAt = Date.now();
        pending = null;
        return r;
      })
      .catch((e) => {
        pending = null;
        throw e;
      });
  }
  return pending;
}
```

Apply debounce when SSE broadcasts are concentrated in a short window.

```typescript
let timer: ReturnType<typeof setTimeout> | null = null;

export function scheduleOverlayBroadcast(): void {
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    const users = await getCached();
    activityClients.forEach((res) =>
      res.write(`event: users:overlay\ndata: ${JSON.stringify(users)}\n\n`),
    );
  }, 1000); // 1s debounce
}
```

## SSE Patterns

### Connection Handling

```typescript
router.get('/:regionCode', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!clients.has(regionCode)) clients.set(regionCode, new Set());
  clients.get(regionCode)!.add(res);

  // Send initial snapshot
  const users = await buildRegionUsers(regionCode);
  res.write(`event: dong:users\ndata: ${JSON.stringify({ regionCode, users })}\n\n`);

  // Keep-alive ping every 30s
  const ping = setInterval(() => res.write(': ping\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(ping);
    clients.get(regionCode)?.delete(res);
  });
});
```

### Broadcast Functions

```typescript
// Single region
export function broadcastToRegion(regionCode: string, event: SSEEvent): void {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  clients.get(regionCode)?.forEach((res) => res.write(payload));
}

// All clients
export function broadcastToAll(event: SSEEvent): void {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  clients.forEach((room) => room.forEach((res) => res.write(payload)));
}
```

### SSE Event Types

```typescript
// packages/types/src/events.ts
type SSEEventType = 'dong:users' | 'heatmap:update' | 'water:toast' | 'users:overlay';

// dong:users     — when region active user list changes
// heatmap:update — when per-dong active count changes (Record<dongCode, count>)
// water:toast    — watering notification (dongCode, nickname)
// users:overlay  — all map overlay users (after session start/end/watering)
```

## KST Date Handling

All dates are based on KST (Asia/Seoul, UTC+9). Trust server time.

```typescript
// routes/water.logic.ts
export function getKstDateString(now: Date = new Date()): string {
  return now
    .toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\. /g, '-')
    .replace(/\.$/, '');
}

// KST midnight = UTC 15:00
// cron expression: '0 15 * * *'
// date string: "YYYY-MM-DD" (stored as string in DB)
```

## Cron Batch Pattern

Register KST-midnight batch jobs in `apps/server/src/cron/midnight.ts`.

```typescript
export function registerCronJobs(): void {
  cron.schedule('0 15 * * *', async () => {
    // KST midnight = UTC 15:00
    console.log('[cron] midnight batch start');
    try {
      await runMidnightBatch();
      console.log('[cron] midnight batch complete');
    } catch (err) {
      console.error('[cron] midnight batch error:', err);
    }
  });
}
```

Midnight batch execution order:

1. Auto-watering (users with 2+ hours of focus and 0 waterings)
2. Bulk mark RUNNING sessions → ABANDONED
3. Redis cleanup (delete dongActive, regionActive, heatmapDong + SSE broadcast)
4. Fossil creation (for users who watered today)

## Evolution Stage Calculation

Creature evolution is calculated as stages 0–9 based on cumulative `waterCount`.

```typescript
// routes/water.logic.ts
const PERSONAL_STAGE_THRESHOLDS = [0, 12, 36, 72, 132, 216, 336, 504, 744, 1080];

export function calcPersonalStage(waterCount: number): number {
  for (let i = PERSONAL_STAGE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (waterCount >= PERSONAL_STAGE_THRESHOLDS[i]!) return i;
  }
  return 0;
}
```

## Response Format

Success responses vary per API, but error responses follow a unified format.

```typescript
// Error response (always this shape)
{ "error": "description string" }

// Status code guide
// 400 — missing required parameter
// 404 — resource not found
// 409 — business rule violation (daily limit exceeded, etc.)
// 500 — internal server error
```
