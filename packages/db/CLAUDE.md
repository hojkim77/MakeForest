# DB — 스키마 & 데이터 모델

## 핵심 엔티티

**User** — 유저 프로필, 소속 동네(`dongCode`, `regionCode`), 닉네임, todosPublic

**Dong** — 읍/면/동 단위, 위경도(`lat`, `lng`) 포함

**DailySession** — 유저별 날짜별 누적 집중 시간(`elapsedSec`), 물주기 횟수(`waterCount`)

**FocusSession** — 개별 집중 세션 로그 (RUNNING / PAUSED / COMPLETED / ABANDONED)
- 자정 분리 계산 및 Redis 캐시의 정본 역할

**UserCreature** — 유저별 날짜별 개인 생명체
- `@@unique([userId, date])` — 유저 1명 × 하루 1개
- `stage` 0~4, `waterCount` 하루 최대 12회
- 진화 임계값: `[0, 1, 3, 6, 10]` (`water.logic.ts`에 하드코딩)
- 자정 배치 대상 (2시간 이상 집중 + 미물주기 유저 자동 1회 부여)

**Fossil** (박제된 생명체) — 숲에 영구 기록
- `@@unique([userId, date])` — 유저 1명 × 하루 1개
- `userId`로 소유자 확정, `dongCode`는 위치 기록용
- `fossilX`, `fossilY`: 전국 250×290 그리드 픽셀 좌표 + ±3px jitter
- `creatureType`: CREATURE_TYPES 14종 순환 (day-of-year + userId 해시 % 14)

**WateringLog** — 물주기 이력 (유저별·동코드별·날짜별 로그)
- Fossil 생성 여부와 무관하게 유지 (통계·스트릭 계산 보조)

**PushSubscription** — 웹 푸시 구독 정보

## 스키마 설계 원칙

- 시간 컬럼은 전부 UTC 저장, 비즈니스 로직에서 KST 변환
- 날짜 컬럼(`date`)은 KST "YYYY-MM-DD" 문자열로 저장
- Fossil은 UserCreature와 분리된 영구 불변 테이블
- 진화 임계값은 `water.logic.ts`에 하드코딩 (Config 테이블 미구현)
- `Creature` 테이블 제거됨 — 지역 공유 생명체 개념 폐기, 개인 `UserCreature`로 전환

## 생명체 진화 임계값

```
stage 0 씨앗:  waterCount = 0
stage 1 새싹:  waterCount >= 1
stage 2 나무1: waterCount >= 3
stage 3 나무2: waterCount >= 6
stage 4 나무3: waterCount >= 10
```
