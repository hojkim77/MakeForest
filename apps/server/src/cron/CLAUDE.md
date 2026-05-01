# Cron — 자정 배치 처리 (KST 00:00)

## 처리 순서 (구현 완료)

1. **물주기 미입력 유저 자동 반영** — 당일 RUNNING/PAUSED 세션 합산 집중시간 >= 7200초 && waterCount = 0인 유저에게 자동 1회 물주기 (WateringLog 생성 + Creature.waterCount++)
2. **RUNNING 세션 전체 ABANDONED** — DB updateMany + Redis dongActive/regionActive 키 삭제, 히트맵 초기화, SSE broadcastHeatmap({})
3. **Fossil 생성** — 전날(KST) Creature 중 stage >= 1 & 가입 유저 1명 이상인 시/군만 대상. 물주기 기록이 있는 대표 dong의 픽셀 좌표 + ±5px jitter. creatureType은 day-of-year % 14 순환
4. **새 Creature 생성** — User.regionCode 보유 유저가 있는 모든 시/군에 오늘 날짜 기준 stage=0 upsert
5. **SSE 브로드캐스트** — creature:update (stage:0) 각 시/군에 전송

## 생명체 단위

- **시/군(regionCode) 기준** — `regionOf(dongCode, dongName)` 함수로 계산
- 서울/광역시: sido 코드(예: `'11'`), 경기 일반시: `'41:부천시'` 형식
- Creature 테이블: `@@unique([regionCode, date])`

## 생명체 박제 조건

- 최소 stage >= 1 (새싹 이상)이어야 Fossil 생성
- stage = 0 (씨앗) → 박제 없음
- 해당 시/군 가입 유저 0명 → 생명체 생성 없음
- Fossil.dongCode 필드에 regionCode를 저장 (MVP — 스키마 마이그레이션 전 임시)

## 새 생명체 결정

- 매일 자정, 시/군별로 stage=0 새 Creature upsert
- creatureType: day-of-year % 14 순환 (날씨/계절 연동은 미구현)

## 진화 임계값

- `STAGE_THRESHOLDS = [0, 5, 12, 25, 45]` — `water.logic.ts`에 하드코딩
- 서버 실시간 조절은 미구현 (Config 테이블 없음)

## 미구현 항목

- 배치 실행 중 물주기 요청 큐 (현재 race condition 허용)
- 날씨/계절 기반 creatureType 결정
- 진화 임계값 Config 테이블

## 수동 실행 (검증용)

`POST /test/run-midnight` (NODE_ENV=test 환경만) — `runMidnightBatch()` 직접 호출
