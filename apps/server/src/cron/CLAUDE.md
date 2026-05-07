# Cron — 자정 배치 처리 (KST 00:00)

## 처리 순서 (구현 완료)

1. **물주기 미입력 유저 자동 반영** — 당일 FocusSession 합산 집중시간 >= 7200초 && DailySession.waterCount = 0인 유저에게 자동 1회 물주기 (WateringLog 생성 + UserCreature upsert + calcPersonalStage 적용)
2. **RUNNING 세션 전체 ABANDONED** — DB updateMany + Redis dongActive/regionActive 키 삭제, 히트맵 초기화, SSE broadcastHeatmap({})
3. **Fossil 생성** — 전날(KST) UserCreature 중 stage >= 1인 유저별로 개인 Fossil 생성. 해당 유저의 `User.dongCode`→ Dong lat/lng → toPixel() + ±3px jitter. `creatureType`은 (day-of-year + userId 해시) % 14 순환
4. **새 Creature 생성 없음** — UserCreature는 첫 물주기 시 온디맨드 생성 (upsert), 자정 사전 생성 불필요

## 생명체 단위

- **유저별(userId) 기준** — `UserCreature.@@unique([userId, date])`
- 기존 지역 공유 `Creature` 테이블 제거됨

## 생명체 박제 조건

- 개인 `UserCreature.stage >= 1` (새싹 이상)이어야 Fossil 생성
- stage = 0 (씨앗, 물주기 0회) → 박제 없음
- `User.dongCode`가 null이면 해당 유저 건너뜀
- `Fossil.@@unique([userId, date])` — 유저 1명 × 하루 1개

## 개인 생명체 진화 임계값

`PERSONAL_STAGE_THRESHOLDS = [0, 1, 3, 6, 10]` — `water.logic.ts`에 하드코딩

## 미구현 항목

- 배치 실행 중 물주기 요청 큐 (현재 race condition 허용)
- 날씨/계절 기반 creatureType 결정
- 진화 임계값 Config 테이블

## 수동 실행 (검증용)

`POST /test/run-midnight` (NODE_ENV=test 환경만) — `runMidnightBatch()` 직접 호출
