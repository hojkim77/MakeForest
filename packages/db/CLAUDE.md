# DB — 스키마 & 데이터 모델

## 핵심 엔티티

**User** — 유저 프로필, 소속 동네(`dongCode`, `regionCode`), 닉네임, todosPublic

**Dong** — 읍/면/동 단위, 위경도(`lat`, `lng`) 포함

**DailySession** — 유저별 날짜별 누적 집중 시간(`elapsedSec`), 일일 물주기 횟수(`waterCount`, 최대 12)

**FocusSession** — 개별 집중 세션 로그 (RUNNING / PAUSED / COMPLETED / ABANDONED)
- 자정 분리 계산 및 Redis 캐시의 정본 역할

**UserCreature** — 유저별 **영구** 생명체 (1인 1개, date 없음)
- `@@unique([userId])` — 유저당 하나, 삭제·리셋 없음
- `stage` 0~9, `waterCount` 생애 누적 물주기 총량
- 진화 임계값: `[0, 12, 36, 72, 132, 216, 336, 504, 744, 1080]` (`water.logic.ts`에 하드코딩)
- 일일 물주기 한도(12회)는 `DailySession.waterCount`로 별도 추적

**Fossil** (박제된 생명체) — 물을 준 날마다 생성되는 일일 스냅샷
- `@@unique([userId, date])` — 유저 1명 × 하루 1개
- `userId`로 소유자 확정, `dongCode`는 위치 기록용
- `stage`: 박제 시점의 영구 생명체 현재 단계 스냅샷
- `fossilX`, `fossilY`: 전국 250×290 그리드 픽셀 좌표 + ±3px jitter
- `creatureType`: CREATURE_TYPES 14종 순환 (day-of-year + userId 해시 % 14)

**WateringLog** — 물주기 이력 (유저별·동코드별·날짜별 로그)
- `createUserFossils`에서 "오늘 물 준 유저" 탐지에 사용

**PushSubscription** — 웹 푸시 구독 정보

## 스키마 설계 원칙

- 시간 컬럼은 전부 UTC 저장, 비즈니스 로직에서 KST 변환
- 날짜 컬럼(`date`)은 KST "YYYY-MM-DD" 문자열로 저장
- Fossil은 UserCreature와 분리된 영구 불변 테이블
- 진화 임계값은 `water.logic.ts`에 하드코딩 (Config 테이블 미구현)
- `Creature` 테이블 제거됨 — 지역 공유 생명체 개념 폐기, 개인 `UserCreature`로 전환

## 생명체 진화 임계값 (누적 waterCount 기준)

| 단계 | 누적 필요량 | 단계별 추가 필요량 |
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

최대 속도(하루 12회)로 90일(약 3개월)에 최고 단계 달성 가능.
