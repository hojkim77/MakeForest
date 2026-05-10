import http from 'k6/http';
import { check, sleep } from 'k6';

const TARGET_URL = __ENV.TARGET_URL || 'http://localhost:4000';
const INTERNAL_SECRET = __ENV.INTERNAL_SECRET || '';
const ACTIVE_VUS = parseInt(__ENV.ACTIVE_VUS || '25');
const SSE_VUS = parseInt(__ENV.SSE_VUS || '20');
const MAP_VUS = parseInt(__ENV.MAP_VUS || '10');
const DURATION = __ENV.DURATION || '1m';
// SSE_TIMEOUT은 DURATION보다 크게 설정 — 테스트 종료 전 자연 timeout이 없어야 재연결이 없음
// gracefulStop(10s) 안에 timeout이 발생해야 check()가 평가됨: DURATION + 5s
const SSE_TIMEOUT = __ENV.SSE_TIMEOUT || '65s';

export const options = {
  scenarios: {
    // S1: 타이머 사용 유저 — 세션/물주기 API를 호출해 브로드캐스트를 트리거
    // broadcastHeatmap(세션 변경 시) + broadcastToRegion(전 이벤트) 두 채널 모두 발생
    active_users: {
      executor: 'constant-vus',
      vus: ACTIVE_VUS,
      duration: DURATION,
      exec: 'activeUserScenario',
    },
    // S2: 지역 SSE 구독자 — /sse/:regionCode 연결을 테스트 종료까지 유지
    // S1 이벤트가 broadcastToRegion() forEach로 이 연결들에 write됨
    // → forEach가 SSE_VUS번 반복되는 비용이 S1 p95 latency에 반영됨
    // gracefulStop: DURATION 종료 후 SSE_TIMEOUT이 발화해 check()가 평가될 시간 확보
    sse_watchers: {
      executor: 'constant-vus',
      vus: SSE_VUS,
      duration: DURATION,
      exec: 'sseScenario',
      gracefulStop: '10s',
    },
    // S3: 전국 맵 구독자 — /map/activity-stream 연결을 테스트 종료까지 유지
    // S1 세션 이벤트가 broadcastHeatmap() forEach로 이 연결들에 write됨
    // → forEach가 MAP_VUS번 반복되는 비용이 S1 p95 latency에 반영됨
    // gracefulStop: DURATION 종료 후 SSE_TIMEOUT이 발화해 check()가 평가될 시간 확보
    map_stream_watchers: {
      executor: 'constant-vus',
      vus: MAP_VUS,
      duration: DURATION,
      exec: 'mapStreamScenario',
      gracefulStop: '10s',
    },
  },
  thresholds: {
    'http_req_duration{scenario:active_users}': ['p(95)<500'],
    'http_req_failed{scenario:active_users}': ['rate<0.01'],
    'checks{scenario:sse_watchers}': ['rate>0.95'],
    'checks{scenario:map_stream_watchers}': ['rate>0.95'],
  },
};

// VU당 캐시 — 첫 iteration에 /test/login 호출 후 재사용
// waterCount: 12회 도달 시 /water 호출 안 함 (프론트엔드 버튼 비활성화와 동일)
const vuCache = {};

function getVuUser() {
  if (vuCache[__VU]) return vuCache[__VU];

  const testId = `load-test-${String(__VU).padStart(3, '0')}`;
  const res = http.post(`${TARGET_URL}/test/login`, JSON.stringify({ testId }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (res.status !== 200) {
    console.error(`[VU ${__VU}] /test/login failed: ${res.status} ${res.body}`);
    return null;
  }

  vuCache[__VU] = {
    userId: res.json('userId'),
    dongCode: res.json('dongCode'),
    regionCode: res.json('regionCode'),
    secret: res.json('secret') || INTERNAL_SECRET,
    waterCount: 0,
  };

  return vuCache[__VU];
}

// ── S1: 통합 활성 유저 시나리오 ────────────────────────────────
// 세션 시작 → 일시정지 → 재개 → 물주기 → 통계 조회 → 종료
// 각 단계에서 발생하는 브로드캐스트:
//   세션 시작/정지/재개/종료 → broadcastHeatmap + broadcastToRegion(dong:users)
//   물주기                   → broadcastToRegion(water:toast, users:overlay)
export function activeUserScenario() {
  const user = getVuUser();
  if (!user) {
    sleep(1);
    return;
  }

  const { userId, dongCode, secret } = user;
  const headers = {
    'Content-Type': 'application/json',
    'x-internal-secret': secret,
  };

  // 1) 세션 시작
  const sessionRes = http.post(
    `${TARGET_URL}/sessions`,
    JSON.stringify({ userId, dongCode, durationSec: 7200, todos: [] }),
    { headers, tags: { name: 'POST /sessions' } },
  );
  const ok = check(sessionRes, { 'session created': (r) => r.status === 200 });
  if (!ok) {
    sleep(1);
    return;
  }

  const sessionId = sessionRes.json('sessionId');
  sleep(2);

  // 2) 일시정지
  http.patch(`${TARGET_URL}/sessions/${sessionId}`, JSON.stringify({ action: 'pause' }), {
    headers,
    tags: { name: 'PATCH /sessions/:id (pause)' },
  });
  sleep(1);

  // 3) 재개
  http.patch(`${TARGET_URL}/sessions/${sessionId}`, JSON.stringify({ action: 'resume' }), {
    headers,
    tags: { name: 'PATCH /sessions/:id (resume)' },
  });
  sleep(2);

  // 4) 물주기 (12회 미만일 때만)
  if (user.waterCount < 12) {
    const waterRes = http.post(
      `${TARGET_URL}/water`,
      JSON.stringify({ userId, dongCode, nickname: `LT${__VU}`, totalElapsedSec: 1800 }),
      { headers, tags: { name: 'POST /water' } },
    );
    if (waterRes.status === 200) user.waterCount++;
    check(waterRes, { 'water ok': (r) => r.status === 200 });
  }
  sleep(1);

  // 5) 통계 조회
  const statsRes = http.get(`${TARGET_URL}/stats/me?userId=${userId}`, {
    tags: { name: 'GET /stats/me' },
  });
  check(statsRes, { 'stats ok': (r) => r.status === 200 });

  // 6) 세션 종료
  http.patch(`${TARGET_URL}/sessions/${sessionId}`, JSON.stringify({ action: 'complete' }), {
    headers,
    tags: { name: 'PATCH /sessions/:id (complete)' },
  });
  sleep(1);
}

// ── S2: 지역 SSE 구독자 시나리오 ──────────────────────────────
// DURATION 동안 /sse/:regionCode 연결을 단 1회 유지 (재연결 없음)
// SSE_TIMEOUT > DURATION 이므로 자연 timeout 없이 DURATION 종료 후 gracefulStop(10s) 안에 발화
// 연결이 열려 있는 동안 S1 이벤트가 broadcastToRegion() 으로 이 연결에 write됨
export function sseScenario() {
  const user = getVuUser();
  if (!user) {
    sleep(1);
    return;
  }

  const res = http.get(`${TARGET_URL}/sse/${user.regionCode}`, {
    headers: { Accept: 'text/event-stream' },
    timeout: SSE_TIMEOUT,
    tags: { name: 'GET /sse/:regionCode' },
  });

  check(res, {
    'sse connected': (r) => r.status === 200 || r.error_code === 1050,
  });
}

// ── S3: 전국 맵 구독자 시나리오 ────────────────────────────────
// DURATION 동안 /map/activity-stream 연결을 단 1회 유지 (재연결 없음)
// SSE_TIMEOUT > DURATION 이므로 자연 timeout 없이 DURATION 종료 후 gracefulStop(10s) 안에 발화
// 연결이 열려 있는 동안 S1 세션 이벤트가 broadcastHeatmap() 으로 이 연결에 write됨
export function mapStreamScenario() {
  const res = http.get(`${TARGET_URL}/map/activity-stream`, {
    headers: { Accept: 'text/event-stream' },
    timeout: SSE_TIMEOUT,
    tags: { name: 'GET /map/activity-stream' },
  });

  check(res, {
    'map stream connected': (r) => r.status === 200 || r.error_code === 1050,
  });
}

export function handleSummary(data) {
  return {
    'load-test/result.json': JSON.stringify(data),
  };
}
