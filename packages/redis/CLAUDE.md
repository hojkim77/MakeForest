# Redis — 실시간 상태 캐싱 규칙

## 저장 대상

**활성 타이머 세션**
- key: `timer:session:{userId}`
- value: 시작 시각, 현재 누적 시간
- 용도: 브라우저 종료 후 재접속 시 복구

**동네별 활성 유저 목록**
- key: `active:neighborhood:{neighborhoodId}`
- value: 집중 중인 유저 목록 (닉네임, 할 일, 남은 타이머)
- 용도: 맵 픽셀 모드 히트맵 + 말풍선

**동네 경험치 / 진화 단계**
- key: `creature:stage:{neighborhoodId}:{date}`
- value: 현재 누적 경험치, 진화 단계
- 용도: 실시간 경험치 바 + 진화 단계 표시

## 원칙

- Redis는 실시간 조회용 캐시 — 정본은 항상 DB
- TTL: 활성 세션은 자정 리셋 시 만료, 일별 데이터는 익일 자정 + 여유 시간
- 자정 배치 후 해당 날짜 키 삭제 및 새 날짜 키 초기화
