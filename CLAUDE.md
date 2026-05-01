# MakeForest — 글로벌 규칙 & 도메인 인덱스

## 프로젝트 구조

```
apps/web      — Next.js 프론트엔드
apps/server   — 백엔드 API 서버
packages/db   — Prisma 스키마/클라이언트
packages/redis — Redis 클라이언트/유틸
packages/types — 공유 타입 정의
```

## 도메인별 CLAUDE.md 위치

| 작업 대상 | 참조 파일 |
|---|---|
| 레이아웃, 인증 UI, 온보딩 | `apps/web/CLAUDE.md` |
| 왼쪽 패널 (내 동네 / 엿보기) | `apps/web/components/panel/CLAUDE.md` |
| 맵 (숲 모드 / 픽셀 모드) | `apps/web/components/map/CLAUDE.md` |
| 타이머 / 물주기 API | `apps/server/CLAUDE.md` |
| 자정 배치 / 생명체 박제 / 숲 누적 | `apps/server/src/cron/CLAUDE.md` |
| DB 스키마 / 데이터 모델 | `packages/db/CLAUDE.md` |
| Redis 실시간 상태 | `packages/redis/CLAUDE.md` |

---

## 글로벌 불변 규칙

- **시간 계산은 서버 기준** — 클라이언트 시간 미신뢰
- **일일 리셋 기준은 KST 00:00**
- **실시간 반영 대상**: 히트맵, 물주기 토스트, 경험치 바, 생명체 진화 단계 → SSE 또는 WebSocket
- **비로그인 유저**: 맵 탐색만 허용, 타이머/물주기 불가, 시도 시 패널 내 로그인 유도 (팝업 없음)

---

## 엣지케이스 (I)

| 상황 | 처리 |
|---|---|
| 자정에 타이머 돌아가는 중 | 자정 배치가 해당 세션 ABANDONED 처리, 2시간 이상이면 자동 물주기 반영 후 전날 생명체 확정 |
| 자정에 물주기 미입력 | 당일 2시간 이상 집중한 유저에 한해 cron이 자동 1회 물주기 반영 |
| 자정 배치 처리 중 물주기 요청 | 미구현 (현재는 race condition 허용, 영향 범위 미미) |
| 2시간 누적이 자정을 넘겨 완성 | 누적 시작한 날 기준으로 전날 생명체에 반영 |
| 브라우저 종료/새로고침 후 새 세션 시작 | 기존 RUNNING/PAUSED 세션 ABANDONED 처리 + Redis 정리 후 새 세션 생성 |
| 물주기 3회 소진 후 | 타이머 계속 + "오늘 물주기 완료! 🎉" 안내 |
