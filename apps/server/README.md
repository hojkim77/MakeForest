# MakeForest — 백엔드 서버 기술 명세서

> `apps/server` — Express + TypeScript 기반 API 서버

---

## 목차

1. [기술 스택](#기술-스택)
2. [디렉토리 구조](#디렉토리-구조)
3. [환경변수](#환경변수)
4. [실행 방법](#실행-방법)
5. [인증 구조](#인증-구조)
6. [API 엔드포인트](#api-엔드포인트)
   - [Sessions (세션)](#sessions-세션)
   - [Harvest (수확)](#harvest-수확)
   - [Water (물주기)](#water-물주기)
   - [Creature (동네 생명체)](#creature-동네-생명체)
   - [Map (지도)](#map-지도)
   - [Stats (통계)](#stats-통계)
   - [SSE (실시간 이벤트)](#sse-실시간-이벤트)
7. [데이터 모델](#데이터-모델)
8. [Redis 저장 구조](#redis-저장-구조)
9. [비즈니스 로직](#비즈니스-로직)
   - [세션 생명주기](#세션-생명주기)
   - [생명체 수확 알고리즘](#생명체-수확-알고리즘)
   - [물주기 및 진화](#물주기-및-진화)
   - [자정 배치 (Cron)](#자정-배치-cron)
10. [에러 처리](#에러-처리)
11. [SSE 브로드캐스트 구조](#sse-브로드캐스트-구조)

---

## 기술 스택

| 항목 | 내용 |
|---|---|
| 런타임 | Node.js + TypeScript (tsx) |
| 프레임워크 | Express 4 |
| 데이터베이스 | Supabase PostgreSQL, Prisma ORM |
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
│   │   ├── harvest.ts        # 수확 (세션 완료 → 생명체 생성)
│   │   ├── water.ts          # 물주기 + 동네 생명체 진화
│   │   ├── creature.ts       # 동네 생명체 조회
│   │   ├── map.ts            # 픽셀 좌표, 활성도, 활성도 SSE
│   │   ├── stats.ts          # 마이페이지 통계
│   │   └── sse.ts            # 동네별 SSE 스트림 + 브로드캐스트
│   └── cron/
│       ├── midnight.ts       # 자정 배치 작업
│       └── CLAUDE.md         # 자정 배치 사양 (미구현 포함)
├── package.json
├── tsconfig.json
└── .env
```

---

## 환경변수

```bash
# 서버
PORT=4000
CLIENT_ORIGIN=http://localhost:3000       # CORS 허용 Origin (Next.js)

# 데이터베이스 (Supabase PostgreSQL)
DATABASE_URL=postgresql://...?pgbouncer=true   # 커넥션 풀링 (런타임)
DIRECT_URL=postgresql://...                     # 직접 연결 (마이그레이션)

# Redis (Upstash REST API)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# 내부 API 인증 (선택, 개발 환경에서는 미설정 시 자동 통과)
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

## 인증 구조

서버는 두 종류의 API를 운영한다.

**공개 API** — 인증 없이 접근 가능 (읽기 전용)
- `/sse`, `/map`, `/creature`, `/stats`, `/health`

**내부 API** — `requireInternalAuth` 미들웨어 적용
- `/sessions`, `/harvest`, `/water`
- Next.js API Route가 세션을 검증한 뒤 `x-internal-secret` 헤더를 붙여 호출
- 헤더 값이 `INTERNAL_API_SECRET`과 일치하지 않으면 401 반환
- 개발 환경(`INTERNAL_API_SECRET` 미설정)에서는 자동 통과

**사용자 신원 전달 방식**
- Express 서버는 자체적으로 소셜 로그인을 처리하지 않음
- Next.js가 사용자 신원을 검증한 뒤 `userId`를 요청 body에 포함시켜 전달

```
클라이언트 → Next.js (소셜 로그인·세션 쿠키 검증)
               ↓
             Express (x-internal-secret + body.userId)
               ↓
             PostgreSQL / Redis
```

---

## API 엔드포인트

### Sessions (세션)

> 집중 세션의 생명주기를 관리한다. 모두 내부 API (인증 필요).

---

#### `POST /sessions` — 세션 시작

**Request Body**

```ts
{
  userId: string
  dongCode: string
  durationSec: number       // 목표 집중 시간 (초)
  todos: { text: string }[] // 오늘의 할 일 목록
}
```

**Response**

```ts
{
  sessionId: string
  startedAt: string  // ISO 8601
}
```

**처리 순서**
1. 기존 `RUNNING` 세션 → `ABANDONED` 처리 (중복 방지)
2. DB에 세션 생성 (`status: RUNNING`)
3. Redis에 세션 캐시 저장 (TTL 6시간)
4. 동네 활성 세션 목록(`dongActive`)에 추가
5. `dong:users` SSE 브로드캐스트

---

#### `GET /sessions/:id` — 세션 조회

**Response**

```ts
{
  id: string
  userId: string
  dongCode: string
  startedAt: string
  durationSec: number
  actualSec: number | null
  todos: { text: string; done: boolean }[]
  status: SessionStatus
}
```

---

#### `PATCH /sessions/:id` — 세션 상태 변경

**Request Body**

```ts
{
  action: 'pause' | 'resume' | 'complete' | 'abandon'
  elapsedSec?: number  // complete 시 필수
}
```

**상태 전이**

```
RUNNING ──pause──→ PAUSED
PAUSED ──resume──→ RUNNING
RUNNING ──complete──→ COMPLETED   (수확 가능)
RUNNING|PAUSED ──abandon──→ ABANDONED
```

- `complete` 시 `actualSec`을 DB에 기록, `DailySession.elapsedSec` 누적
- SSE로 동네에 상태 변경 브로드캐스트

---

### Harvest (수확)

> 완료된 세션을 바탕으로 생명체를 생성한다. 내부 API (인증 필요).

---

#### `POST /harvest/:sessionId` — 수확

**Request Body**

```ts
{ userId: string }
```

**Response**

```ts
{
  forestObject: {
    id: string
    creatureType: string
    forestX: number
    forestY: number
    date: string
  }
}
```

**검증 조건**
- 세션 `status === 'COMPLETED'` 여야 함
- `actualSec >= 60` (최소 1분)
- 오늘(KST) 이미 수확한 `ForestObject`가 없어야 함

**처리 순서 (트랜잭션)**
1. 빈 좌표 탐색 (동네 100×100 그리드)
2. 생명체 타입 결정 (집중 시간 + 계절 가중치)
3. `ForestObject` 생성
4. 세션 `status → HARVESTED`
5. SSE로 `forest:new` 브로드캐스트

---

### Water (물주기)

> 동네 생명체에 물을 주고 진화 단계를 업데이트한다. 내부 API (인증 필요).

---

#### `POST /water` — 물주기

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
  myWaterCount: number      // 오늘 내가 준 물 횟수 (최대 3)
  creature: {
    stage: number           // 0~4
    waterCount: number      // 동네 누적 물주기 수
  }
}
```

**검증 조건**
- 오늘(KST) `WateringLog` 3회 미만이어야 함 → 초과 시 409

**처리 순서 (트랜잭션)**
1. `WateringLog` 기록
2. `Creature.waterCount` +1
3. stage 재계산 (임계값 기준)
4. `DailySession.waterCount` +1
5. SSE `water:toast` + `creature:update` 브로드캐스트

---

#### `GET /water/me` — 오늘 내 물주기 횟수 조회

**Query Params**

```
userId: string
date: string  // YYYY-MM-DD (KST)
```

**Response**

```ts
{ waterCount: number }
```

---

### Creature (동네 생명체)

---

#### `GET /creature/:dongCode` — 동네 생명체 상태 조회

**Response**

```ts
{
  stage: number       // 0~4 (없으면 0)
  waterCount: number  // 동네 누적 물주기 수 (없으면 0)
  date: string        // YYYY-MM-DD (KST)
}
```

---

### Map (지도)

---

#### `GET /map/pixel-data` — 행정동 픽셀 좌표 목록

한반도 위경도 범위(33.0°~38.9°N, 124.6°~131.0°E)를 250×290 픽셀 그리드로 변환한 좌표를 반환한다.

**Response**

```ts
{
  dongCode: string
  name: string
  pixelX: number
  pixelY: number
}[]
```

**캐시**: `Cache-Control: public, max-age=86400` (24시간)

---

#### `GET /map/activity` — 동네별 활성 유저 수 스냅샷

**Response**

```ts
{ [dongCode: string]: number }
```

Redis `heatmap:dong` 해시에서 직접 조회한다.

---

#### `GET /map/activity-stream` — 활성도 SSE 스트림

- 연결 즉시 현재 히트맵 전송
- 이후 10초 간격으로 `heatmap:update` 이벤트 전송
- 30초 간격으로 핑 전송 (연결 유지)

---

### Stats (통계)

---

#### `GET /stats/me` — 마이페이지 통계

**Query Params**

```
userId: string
dongCode: string
```

**Response**

```ts
{
  totalFocusSec: number      // 전체 누적 집중 시간 (초)
  currentStreak: number      // 현재 연속 물주기 일수
  maxStreak: number          // 역대 최장 스트릭
  neighborhoodRank: number   // 동네 내 물주기 누적 순위
  neighborhoodTotal: number  // 동네 전체 유저 수
  weeklyData: {              // 최근 4주 주간 물주기
    week: string
    waterCount: number
  }[]
  weeklyAvg: number          // 4주 평균 물주기
  collection: {              // 생명체 도감
    seed: number
    sprout: number
    grass: number
    tree: number
  }
  dongName: string
}
```

---

### SSE (실시간 이벤트)

---

#### `GET /sse/:dongCode` — 동네 실시간 이벤트 스트림

연결 시 해당 동네의 현재 활성 세션 목록(`dong:users`)을 즉시 전송한다.
이후 동네에 이벤트 발생 시 서버가 push 한다.

**30초 간격 핑으로 연결 유지.**

**이벤트 종류**

| 이벤트명 | 발신 시점 | 데이터 |
|---|---|---|
| `dong:users` | 연결 시, 세션 시작/종료 시 | 동네 활성 유저 목록 |
| `forest:new` | 수확 완료 시 | 새로 생긴 생명체 정보 |
| `creature:update` | 물주기 시 | `{ stage, waterCount }` |
| `water:toast` | 물주기 시 | `{ nickname }` |
| `heatmap:update` | 활성도 변경 시 | `{ dongCode: count }` |
| `session:update` | 세션 상태 변경 시 | `{ sessionId, status }` |

---

## 데이터 모델

> 전체 스키마 정의는 `packages/db/` 참고.

```
User
  id, provider, providerId, nickname, avatarUrl, dongCode, todosPublic

FocusSession
  id, userId, dongCode
  startedAt, endedAt
  durationSec (목표), actualSec (실제)
  todos: Json
  status: RUNNING | PAUSED | COMPLETED | HARVESTED | ABANDONED

ForestObject
  id, userId, sessionId, dongCode
  forestX (0~99), forestY (0~99)
  creatureType, harvestedAt
  date: YYYY-MM-DD (KST)

Dong
  code, name, sigunguCode, sidoCode, lat, lng

Creature                              ← 오늘의 동네 생명체
  id, dongCode, date
  stage (0~4), waterCount
  UNIQUE(dongCode, date)

WateringLog                           ← 물주기 이력
  id, userId, dongCode, date

DailySession                          ← 유저별 날짜별 집계
  id, userId, date
  elapsedSec (누적 집중 시간)
  waterCount (오늘 내가 준 물, 0~3)
  UNIQUE(userId, date)
```

---

## Redis 저장 구조

| 키 패턴 | 타입 | 내용 | TTL |
|---|---|---|---|
| `session:{sessionId}` | String (JSON) | 세션 캐시 (userId, dongCode, startedAt 등) | 6시간 |
| `dong:active:{dongCode}` | Set | 동네의 활성 sessionId 목록 | 없음 |
| `heatmap:dong` | Hash | dongCode → 현재 활성 유저 수 | 없음 |

**세션 캐시 용도**: 브라우저 종료 후 재접속 시 복구 (이어하기 안내)

---

## 비즈니스 로직

### 세션 생명주기

```
[시작] POST /sessions
  → 기존 RUNNING 세션 ABANDONED
  → 새 세션 DB + Redis 저장

[일시정지] PATCH /sessions/:id { action: pause }
  → status: PAUSED

[재개] PATCH /sessions/:id { action: resume }
  → status: RUNNING

[완료] PATCH /sessions/:id { action: complete, elapsedSec }
  → actualSec 기록
  → DailySession.elapsedSec 누적
  → status: COMPLETED

[수확] POST /harvest/:sessionId
  → ForestObject 생성
  → status: HARVESTED

[자동 만료] Cron (자정)
  → 24시간 이상 COMPLETED 미수확 → ABANDONED
```

---

### 생명체 수확 알고리즘

집중 시간(actualSec)을 기준으로 생명체 풀을 결정하고, 계절 가중치를 적용해 최종 타입을 선택한다.

| 집중 시간 | 생명체 풀 |
|---|---|
| < 30분 | 씨앗류 (SEED, SPROUT) |
| 30분~1시간 | 풀·꽃류 (GRASS, FLOWER_A, FLOWER_B) |
| 1~2시간 | 작은 나무 (SAPLING, MUSHROOM, ROCK) |
| 2~3시간 | 중간 나무 (OAK, PINE, BAMBOO) |
| 3시간+ | 큰 나무·희귀 (BIG_OAK, CHERRY, RARE_ANIMAL) |

**계절 가중치**

| 계절 | 가중치 적용 타입 |
|---|---|
| 봄 | FLOWER_A, FLOWER_B, CHERRY |
| 여름 | GRASS, BAMBOO |
| 가을 | MUSHROOM, OAK |
| 겨울 | PINE, BIG_OAK |

- 실제 집중 시간은 최대 5시간(18,000초)으로 캡
- 빈 좌표 탐색은 트랜잭션 내에서 원자적으로 처리 (동네 100×100 그리드)

---

### 물주기 및 진화

**일일 제한**: 유저 1명당 3회 (KST 기준)

**동네 생명체 진화 임계값** (동네 전체 누적 `waterCount` 기준)

| waterCount 범위 | stage |
|---|---|
| 0~4 | 0 (씨앗) |
| 5~11 | 1 (새싹) |
| 12~24 | 2 (풀) |
| 25~44 | 3 (나무) |
| 45+ | 4 (큰 나무) |

---

### 자정 배치 (Cron)

**실행 시각**: 매일 KST 00:00 (= UTC 15:00)
**스케줄 표현식**: `0 15 * * *`

**현재 구현**

- 24시간 이상 `COMPLETED` 상태로 방치된 세션 → `ABANDONED` 일괄 처리

**구현 예정** (spec, `src/cron/CLAUDE.md` 참고)

1. 당일 물주기 미입력 유저 자동 반영
2. 동네 생명체 최종 단계 확정
3. 조건 충족 생명체 박제 (stage ≥ 1 이상만, 씨앗 제외)
4. 날씨 API + 계절 기반 새 생명체 결정 및 생성
5. DailySession 초기화

---

## 에러 처리

**HTTP 상태 코드 규칙**

| 코드 | 사용 상황 |
|---|---|
| 200 | 정상 처리 |
| 400 | 필수 파라미터 누락, 최소 집중 시간 미달 |
| 401 | 내부 API 인증 실패 |
| 404 | 세션·리소스 없음 |
| 409 | 비즈니스 규칙 위반 (물주기 초과, 중복 수확) |

**응답 형식**

```ts
{ error: string }
```

트랜잭션 실패(Prisma 제약 조건 위반 등)는 400으로 반환한다.

---

## SSE 브로드캐스트 구조

`src/routes/sse.ts`에서 동코드별로 연결된 클라이언트 목록을 인메모리 Map으로 관리한다.

```ts
const clients = new Map<string, Set<Response>>()
// dongCode → 연결된 Response 객체 Set
```

다른 라우터에서 이벤트를 발행할 때는 공개 함수를 호출한다.

```ts
// 특정 동네에만 전송
broadcastToDong(dongCode, { event: 'creature:update', data: { stage, waterCount } })

// 전체 클라이언트에 전송
broadcastToAll({ event: 'heatmap:update', data: heatmap })
```

클라이언트 연결 종료 시 Set에서 제거 및 pingInterval 정리가 자동으로 처리된다.
