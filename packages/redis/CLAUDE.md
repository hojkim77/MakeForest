# Redis — 실시간 상태 캐싱 규칙

## 저장 대상

**활성 세션 캐시**
- key: `session:{sessionId}`
- value: `ActiveSessionCache` — 아래 필드 전체 JSON
  ```
  userId, dongCode, startedAt, durationSec, todos, status
  nickname, pixelX, pixelY           // ForestMap 오버레이 표시용
  waterCount, creatureStage          // 물주기 시 갱신
  todosPublic                        // 프라이버시 제어
  ```
- 세션 시작(`POST /sessions`) 시 저장, 물주기·일시정지·재개 시 갱신
- 자정 배치 후 RUNNING 세션 ABANDONED 처리 시 삭제

**동네별 활성 세션 Set**
- key: `dong:{dongCode}:active`
- value: 해당 동에서 RUNNING 중인 sessionId Set
- 히트맵 계산 및 `users:overlay` 조립에 사용

**시/군별 활성 세션 Set**
- key: `region:{regionCode}:active`
- value: 해당 시/군에서 활성 중인 sessionId Set
- `/sse/:regionCode` 구독자에게 `dong:users` 브로드캐스트 시 사용

**히트맵 해시**
- key: `heatmap:dong`
- value: `{ [dongCode]: activeCount }` 해시
- `heatmap:update` SSE 이벤트의 원천 데이터

## 원칙

- Redis는 실시간 조회용 캐시 — 정본은 항상 DB
- 세션 캐시 TTL 없음 (자정 배치가 명시적으로 삭제)
- `creature:stage` 키 없음 — 개인 생명체 상태는 세션 캐시의 `waterCount`/`creatureStage` 필드로 관리
- 자정 배치 후 heatmapDong 해시 전체 삭제 + dongActive / regionActive Set 정리
