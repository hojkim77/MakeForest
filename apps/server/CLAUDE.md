# Server — Timer & Watering API (E)

## API 타입 규칙

- 모든 라우트 요청/응답 타입은 `packages/types/src/schemas/` 에 Zod 스키마로 정의
- 라우트 핸들러에서 `req.body as { ... }` 캐스팅 금지 — 반드시 `Schema.parse(req.body)` 사용
- 유효성 검증 실패 시 ZodError가 throw되면 `apps/server/src/index.ts`의 에러 미들웨어가 자동으로 400 응답 처리
- 새 엔드포인트 추가 시: `packages/types/src/schemas/<domain>.schema.ts` 에 스키마 정의 → `schemas/index.ts` 에 re-export → 라우트에서 import

## Auth (A)

- Kakao / Google social login only
- After token issuance, check whether the user has set a neighborhood — redirect to onboarding if not

## Timer (E)

- Elapsed time is **server-authoritative** (client time is never trusted)
- Start time recorded on server; end time recorded on stop; elapsed time accumulated server-side
- **One RUNNING session per user** — `POST /sessions` immediately ABBANDONs any existing RUNNING/PAUSED session + clears Redis (dongActive, regionActive)
- Day boundary = KST 00:00 — sessions crossing midnight are split across the previous and next day
- Daily maximum: 6 hours (21600 seconds) — enforced server-side as a hard cap

## Watering API (E)

- **Pomodoro style**: 1 water per 30 minutes of focus (max 12/day)
- Water button activation condition: `RUNNING` state OR (`PAUSED` && `autoPaused`) + `elapsedSec >= 1800` (frontend guard)
- Successful water deducts 30 minutes from the timer (frontend: `resetWaterProgress()` — `elapsedSec - 1800`)
- Only manual button presses count — no automatic watering; midnight auto-watering is handled by cron
- **6-hour daily cap (21600s)** — `checkDailyCapExceeded` server validation, returns 409 if exceeded
- **12-water daily limit** — `DailySession.waterCount >= 12` returns 409
- Each water updates the user's `UserCreature` evolution stage (response includes `userCreature: { stage, waterCount }`)
- On success: broadcasts `water:toast` SSE to the whole neighborhood + immediately re-broadcasts `users:overlay`
- Response format: `{ myWaterCount: number, userCreature: { stage: number, totalWaterCount: number } }`
  - `myWaterCount`: waters given today (1–12, based on DailySession)
  - `userCreature.totalWaterCount`: **lifetime** cumulative water count (used to compute stage)
  - `userCreature.stage`: current stage (0–9) based on cumulative totalWaterCount
- UI: 6-hour range split into 12 segments (30 min each); `growthPercent` = progress toward next creature stage (based on `totalWaterCount`)

## Mypage Stats API (H)

Stats are split across 3 endpoints:

### `GET /stats/focus?userId=`
- `totalFocusSec`: total cumulative focus time (sum of all DailySession.elapsedSec)
- `currentStreak`: consecutive contribution days (days with ≥1 water, counted backwards from today or yesterday)
- `maxStreak`: all-time longest consecutive streak

### `GET /stats/weekly?userId=`
- `weeklyData`: last 4 weeks of water totals `[{ week: 1–4, waterCount: number }]` (week 1 = oldest)
- `weeklyAvg`: 4-week average water count (rounded to integer)

### `GET /stats/rank?userId=&dongCode=`
- `neighborhoodRank`: user's cumulative water rank within their neighborhood (1-based)
- `neighborhoodTotal`: total user count in the neighborhood
- If `dongCode` is omitted: returns `{ neighborhoodRank: 0, neighborhoodTotal: 0 }`
