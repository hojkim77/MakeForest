# MakeForest — 백엔드 서버

> `apps/server` — Express + TypeScript 기반 API 서버

---

## 목차

1. [기술 스택](#기술-스택)
2. [디렉토리 구조](#디렉토리-구조)
3. [환경변수](#환경변수)
4. [실행 방법](#실행-방법)
5. [전체 흐름](#전체-흐름)
6. [인증 구조](#인증-구조)
7. [API 엔드포인트](#api-엔드포인트)
8. [SSE 실시간 이벤트](#sse-실시간-이벤트)
9. [데이터 모델](#데이터-모델)
10. [Redis 저장 구조](#redis-저장-구조)
11. [비즈니스 로직](#비즈니스-로직)
12. [에러 처리](#에러-처리)

---

## 기술 스택

| 항목 | 내용 |
|---|---|
| 런타임 | Node.js + TypeScript (tsx) |
| 프레임워크 | Express 4 |
| 데이터베이스 | Supabase PostgreSQL + Prisma ORM |
| 캐시 / 실시간 상태 | Upstash Redis (HTTP REST) |
| 실시간 통신 | Server-Sent Events (SSE) |
| 스케줄러 | node-cron |
| 내부 의존성 | `@makeforest/db`, `@makeforest/redis`, `@makeforest/types` |

---

## 디렉토리 구조

```
apps/server/
├── src/
│   ├── index.ts              # 앱 진입점, 라우터 등록, cron 초기화
│   ├── middleware/
│   │   └── auth.ts           # x-internal-secret 인증 미들웨어
│   ├── routes/
│   │   ├── sessions.ts       # 세션 생성·조회·상태 변경
│   │   ├── water.ts          # 물주기 + 동네 생명체 진화
│   │   ├── creature.ts       # 동네 생명체 조회
│   │   ├── map.ts            # 픽셀 좌표, 활성도 스냅샷, 활성도 SSE
│   │   ├── stats.ts          # 마이페이지 통계
│   │   └── sse.ts            # 동네별 SSE 스트림 + 브로드캐스트 헬퍼
│   └── cron/
│       └── midnight.ts       # 자정 배치 작업 (KST 00:00)
├── package.json
├── tsconfig.json
└── .env
```

---

## 환경변수

```bash
# 서버
PORT=4000
CLIENT_ORIGIN=http://localhost:3000        # CORS 허용 Origin (Next.js)

# 데이터베이스 (Supabase PostgreSQL)
DATABASE_URL=postgresql://...?pgbouncer=true   # 커넥션 풀링 (런타임)
DIRECT_URL=postgresql://...                     # 직접 연결 (마이그레이션)

# Redis (Upstash REST API)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# 내부 API 인증 (미설정 시 개발 환경에서 자동 통과)
INTERNAL_API_SECRET=...
```

---

## 실행 방법

```bash
# 개발 (핫 리로드)
pnpm dev

# 빌드
pnpm build

# 프로덕션 실행
pnpm start

# 타입 체크
pnpm type-check
```

---

## 전체 흐름

### 요청 경로

```
브라우저 (Next.js :3000)
  │
  ├─ 읽기 API (지도, 생명체, 통계) ──────────────→ Express :4000
  │
  ├─ 쓰기 API (세션, 물주기, 수확)
  │    └─ Next.js API Route
  │         ├─ 세션 쿠키로 userId 검증
  │         ├─ x-internal-secret 헤더 추가
  │         └────────────────────────────────────→ Express :4000
  │
  └─ SSE 연결 (실시간)
       ├─ /sse/:dongCode ──────────────────────→ Express :4000
       └─ /map/activity-stream ──────────────→ Express :4000
```

### 타이머 시작 → 지도 반영 흐름

```
① 유저가 타이머 시작 버튼 클릭
② POST /api/sessions  (Next.js API Route)
③ POST /sessions      (Express)
   ├─ DB: FocusSession 생성 (RUNNING)
   └─ 백그라운드:
        ├─ Redis: session:{id} 캐시 저장 (TTL 6h)
        ├─ Redis: dong:{dongCode}:active Set에 sessionId 추가
        ├─ Redis: heatmap:dong Hash 카운트 갱신
        ├─ SSE → /map/activity-stream 구독자: heatmap:update 브로드캐스트
        └─ SSE → /sse/:dongCode 구독자: dong:users 브로드캐스트
④ 브라우저 EventSource 수신
   ├─ heatmap:update → 지도 픽셀 색상 즉시 갱신 (초록 명도)
   └─ dong:users     → 동네 패널 활성 유저 목록 갱신
```

> Redis·SSE 처리는 DB 응답과 분리된 백그라운드 작업이므로, Redis가 간헐적으로 실패해도 세션 생성 응답(200)에 영향을 주지 않는다.

### 세션 상태별 Redis 동기화

```
RUNNING ──pause──→ PAUSED     : dong:active에서 제거, 히트맵 -1, SSE 브로드캐스트
PAUSED ──resume──→ RUNNING    : dong:active에 추가, 히트맵 +1, SSE 브로드캐스트
RUNNING ──complete──→ COMPLETED : dong:active에서 제거, 히트맵 -1, SSE 브로드캐스트
ANY ──abandon──→ ABANDONED    : dong:active에서 제거, 히트맵 -1, SSE 브로드캐스트
```

### 물주기 흐름

```
① 유저가 물주기 버튼 클릭 (30분 누적 후 활성화)
② POST /api/water  (Next.js API Route)
③ POST /water      (Express)
   └─ DB 트랜잭션:
        ├─ WateringLog 생성
        ├─ Creature.waterCount +1, stage 재계산
        └─ DailySession.waterCount +1
④ SSE → /sse/:dongCode 구독자:
   ├─ water:toast     (토스트 알림: "OOO님이 물을 줬어요 💧")
   └─ creature:update (경험치 바 + 진화 단계 갱신)
```

### SSE 연결 구조

서버는 SSE 채널을 두 개 운영한다.

| 채널 | 엔드포인트 | 구독 단위 | 전달 데이터 |
|---|---|---|---|
| 동네 채널 | `/sse/:dongCode` | 동네별 | dong:users, water:toast, creature:update |
| 히트맵 채널 | `/map/activity-stream` | 전체 공통 | heatmap:update |

```
         ┌─────────────────────────────────────┐
         │           Express SSE               │
         │                                     │
sessions ──→ broadcastHeatmap() ──→ /map/activity-stream 구독자들
         │                                     │
water    ──→ broadcastToDong()  ──→ /sse/:dongCode 구독자들
         │                                     │
         └─────────────────────────────────────┘
```

---

## 인증 구조

**공개 API** — 인증 없이 접근 (읽기 전용)

```
GET  /sse/:dongCode
GET  /map/*
GET  /creature/:dongCode
GET  /stats/me
GET  /health
```

**내부 API** — `requireInternalAuth` 미들웨어 적용

```
POST   /sessions
GET    /sessions/:id
PATCH  /sessions/:id
POST   /water
GET    /water/me
```

Next.js API Route가 소셜 로그인 세션을 검증한 뒤 `x-internal-secret` 헤더를 추가하고 `userId`를 body에 포함하여 Express를 호출한다. Express는 별도의 사용자 인증을 수행하지 않는다.

---

## API 엔드포인트

### `POST /sessions` — 세션 시작

**Request Body**

```ts
{
  userId: string
  dongCode: string
  durationSec: number        // 목표 집중 시간 (초)
  todos: { text: string }[]
}
```

**Response**

```ts
{
  sessionId: string
  startedAt: string   // ISO 8601
}
```

**처리 순서**
1. 기존 `RUNNING` 세션 → `ABANDONED` (중복 방지)
2. DB에 `FocusSession` 생성 (`status: RUNNING`)
3. **응답 반환** ← DB 완료 즉시
4. 백그라운드: Redis 캐시 + dong:active 갱신 + 히트맵 broadcast + dong:users broadcast

---

### `GET /sessions/:id` — 세션 조회

**Response**

```ts
{
  id: string
  userId: string
  dongCode: string
  startedAt: string
  endedAt: string | null
  durationSec: number
  todos: { id: string; text: string; done: boolean }[]
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED'
}
```

---

### `PATCH /sessions/:id` — 세션 상태 변경

**Request Body**

```ts
{ action: 'pause' | 'resume' | 'complete' | 'abandon' }
```

**상태 전이**

```
RUNNING  ──pause────→ PAUSED
PAUSED   ──resume───→ RUNNING
RUNNING  ──complete─→ COMPLETED
RUNNING  ──abandon──→ ABANDONED
PAUSED   ──abandon──→ ABANDONED
```

**처리 순서**
1. DB `FocusSession.status` 업데이트
2. **응답 반환** ← DB 완료 즉시
3. 백그라운드: Redis dong:active 갱신 + 히트맵 broadcast + dong:users broadcast + 세션 캐시 status 동기화

---

### `POST /water` — 물주기

**Request Body**

```ts
{
  userId: string
  dongCode: string
  nickname: string
}
```

**Response**

```ts
{
  myWaterCount: number   // 오늘 내가 준 횟수 (최대 3)
  creature: {
    stage: number        // 0~4
    waterCount: number   // 동네 누적 물주기 수
  }
}
```

**검증**: 오늘(KST) `WateringLog` 3회 미만 → 초과 시 409

**처리 순서 (DB 트랜잭션)**
1. `WateringLog` 생성
2. `Creature.waterCount` +1, `stage` 재계산
3. `DailySession.waterCount` +1
4. SSE `water:toast` + `creature:update` 브로드캐스트

---

### `GET /water/me` — 오늘 내 물주기 횟수

**Query Params**: `userId`, `date` (YYYY-MM-DD, 생략 시 오늘 KST)

**Response**: `{ waterCount: number, date: string }`

---

### `GET /creature/:dongCode` — 동네 생명체 조회

**Response**

```ts
{
  stage: number       // 0~4 (없으면 0)
  waterCount: number  // 동네 누적 물주기 수
  date: string        // YYYY-MM-DD (KST)
}
```

---

### `GET /map/pixel-data` — 행정동 픽셀 좌표

한반도 위경도(33.0°~38.9°N, 124.6°~131.0°E)를 250×290 그리드로 변환한 좌표를 반환한다.

**Response**: `{ dongCode, name, pixelX, pixelY }[]`

**캐시**: `Cache-Control: public, max-age=86400` (24시간)

---

### `GET /map/activity` — 활성도 스냅샷

Redis `heatmap:dong` Hash에서 직접 조회한다.

**Response**: `{ [dongCode: string]: number }`

---

### `GET /map/activity-stream` — 활성도 SSE

- 연결 즉시 현재 히트맵 전송
- 이후 10초 간격으로 `heatmap:update` 이벤트 전송
- 30초 간격으로 ping 전송 (연결 유지)

---

### `GET /stats/me` — 마이페이지 통계

**Query Params**: `userId`, `dongCode`

**Response**

```ts
{
  totalFocusSec: number       // 전체 누적 집중 시간
  currentStreak: number       // 현재 연속 물주기 일수
  maxStreak: number           // 역대 최장 스트릭
  neighborhoodRank: number    // 동네 내 물주기 순위
  neighborhoodTotal: number   // 동네 전체 유저 수
  weeklyData: { week: number; waterCount: number }[]  // 최근 4주
  weeklyAvg: number
  collection: { seed: number; sprout: number; grass: number; tree: number }
  dongName: string
}
```

---

## SSE 실시간 이벤트

### `/sse/:dongCode` — 동네 채널

연결 시 현재 동네 활성 유저 목록(`dong:users`)을 즉시 전송하고, 이후 이벤트를 push한다.

| 이벤트 | 발신 시점 | 데이터 |
|---|---|---|
| `dong:users` | 연결 시 / 세션 시작·일시정지·재개·종료 시 | `{ dongCode, users: [{ nickname, elapsedSec, todos }] }` |
| `water:toast` | 물주기 성공 시 | `{ dongCode, nickname }` |
| `creature:update` | 물주기 후 단계 변경 시 | `{ dongCode, stage, waterCount }` |
### `/map/activity-stream` — 히트맵 채널

| 이벤트 | 발신 시점 | 데이터 |
|---|---|---|
| `heatmap:update` | 연결 시 / 세션 시작·종료·일시정지·재개 시 / 10초 간격 | `{ [dongCode]: number }` |

> **클라이언트 재연결**: 연결 오류 시 지수 백오프(1s → 2s → ... 최대 30s)로 자동 재연결한다.

---

## 데이터 모델

```
User
  id, provider, providerId, nickname, avatarUrl
  dongCode        ← 내 동네 행정동 코드
  todosPublic     ← 할 일 공개 여부

FocusSession      ← 집중 세션 1회
  id, userId, dongCode
  startedAt, endedAt         (UTC)
  durationSec                 목표 시간
  todos: Json
  status: RUNNING | PAUSED | COMPLETED | ABANDONED

Fossil            ← 자정 cron이 박제한 동네 생명체 (영구 기록)
  dongCode, date  (unique pair)
  creatureType, stage  최종 종류·단계
  fossilX, fossilY    (동네 내 격자 좌표)

Dong              ← 행정동 마스터
  code, name, sigunguCode, sidoCode, lat, lng

Creature          ← 오늘의 동네 생명체
  dongCode, date  (unique pair)
  stage (0~4), waterCount
  → 매일 자정 초기화

WateringLog       ← 물주기 이력
  userId, dongCode, date

DailySession      ← 유저별 날짜별 집계
  userId, date    (unique pair)
  elapsedSec      누적 집중 시간
  waterCount      오늘 물주기 횟수 (0~3)
```

---

## Redis 저장 구조

| 키 | 타입 | 내용 | TTL |
|---|---|---|---|
| `session:{sessionId}` | String (JSON) | 세션 캐시 (userId, dongCode, startedAt, status 등) | 6시간 |
| `dong:{dongCode}:active` | Set | 현재 RUNNING 상태인 sessionId 목록 | 없음 |
| `heatmap:dong` | Hash | `dongCode → 활성 유저 수` | 없음 |

**세션 캐시 용도**: SSE 연결 시 활성 유저 목록 즉시 조회 + 브라우저 재접속 시 복구 안내

**dong:active Set 동기화 규칙**

| 세션 상태 | Set 처리 |
|---|---|
| RUNNING (새 세션) | `SADD` |
| PAUSED | `SREM` |
| RUNNING (재개) | `SADD` |
| COMPLETED / ABANDONED | `SREM` |

---

## 비즈니스 로직

### 세션 생명주기

```
POST /sessions
  → 기존 RUNNING 세션 ABANDONED
  → 새 세션 생성 (RUNNING)

PATCH { action: pause }    → PAUSED        (타이머 일시정지)
PATCH { action: resume }   → RUNNING       (타이머 재개)
PATCH { action: complete } → COMPLETED     (타이머 종료)
PATCH { action: abandon }  → ABANDONED     (포기)
```

### 물주기 진화 임계값

동네 전체 누적 `waterCount` 기준

| waterCount | stage |
|---|---|
| 0 ~ 4 | 0 (씨앗) |
| 5 ~ 11 | 1 (새싹) |
| 12 ~ 24 | 2 (풀) |
| 25 ~ 44 | 3 (나무) |
| 45+ | 4 (큰 나무) |

### 자정 배치 (Cron)

**실행**: 매일 KST 00:00 (`0 15 * * *` UTC)

**구현 예정** (`src/cron/CLAUDE.md` 참고)
- 당일 물주기 미입력 자동 반영
- 동네 생명체 최종 단계 확정 및 Fossil 박제 (stage ≥ 1)
- 새 Creature(씨앗) 생성
- DailySession 초기화

---

## 에러 처리

| 코드 | 상황 |
|---|---|
| 200 | 정상 처리 |
| 400 | 필수 파라미터 누락, 최소 집중 시간 미달 |
| 401 | 내부 API 인증 실패 |
| 404 | 리소스 없음 |
| 409 | 물주기 3회 초과 |
| 500 | DB 오류 (Redis·SSE 오류는 백그라운드 처리되어 응답에 영향 없음) |

**응답 형식**: `{ error: string }`
