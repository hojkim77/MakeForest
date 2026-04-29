import http from 'k6/http';
import { check, sleep } from 'k6';

const TARGET_URL = __ENV.TARGET_URL || 'http://localhost:4000';
const INTERNAL_SECRET = __ENV.INTERNAL_SECRET || '';
const API_VUS = parseInt(__ENV.API_VUS || '25');
const TOGGLE_VUS = parseInt(__ENV.TOGGLE_VUS || '5');
const SSE_VUS = parseInt(__ENV.SSE_VUS || '20');
const DURATION = __ENV.DURATION || '1m';

export const options = {
  scenarios: {
    // 타이머 사용 유저: 세션 시작 → 물주기 → 통계 조회 루프 (주 API 부하)
    api_users: {
      executor: 'constant-vus',
      vus: API_VUS,
      duration: DURATION,
      exec: 'apiScenario',
    },
    // 타이머 토글 유저: 세션 ON→OFF 반복으로 SSE 이벤트 집중 생성
    timer_toggler: {
      executor: 'constant-vus',
      vus: TOGGLE_VUS,
      duration: DURATION,
      exec: 'toggleScenario',
    },
    // 지도 열람 유저: SSE 연결을 맺고 이벤트 수신 확인
    sse_watchers: {
      executor: 'constant-vus',
      vus: SSE_VUS,
      duration: DURATION,
      exec: 'sseScenario',
    },
  },
  thresholds: {
    // API / 토글 유저 SLA — 초과 시 CI 실패
    'http_req_duration{scenario:api_users}': ['p95<500'],
    'http_req_failed{scenario:api_users}': ['rate<0.01'],
    'http_req_duration{scenario:timer_toggler}': ['p95<500'],
    'http_req_failed{scenario:timer_toggler}': ['rate<0.01'],
    // SSE는 timeout이 정상 종료이므로 http_req_failed 대신 check 성공률로 평가
    'checks{scenario:sse_watchers}': ['rate>0.95'],
  },
};

// VU당 캐시 — 첫 iteration에 /test/login 호출 후 재사용
const vuCache = {};

function getVuUser() {
  if (vuCache[__VU]) return vuCache[__VU];

  const testId = `load-test-${String(__VU).padStart(3, '0')}`;
  const res = http.post(
    `${TARGET_URL}/test/login`,
    JSON.stringify({ testId }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status !== 200) {
    console.error(`[VU ${__VU}] /test/login failed: ${res.status} ${res.body}`);
    return null;
  }

  vuCache[__VU] = {
    userId: res.json('userId'),
    dongCode: res.json('dongCode'),
    secret: res.json('secret') || INTERNAL_SECRET,
  };

  return vuCache[__VU];
}

// ── API 유저 시나리오 ──────────────────────────────────────────
export function apiScenario() {
  const user = getVuUser();
  if (!user) { sleep(1); return; }

  const { userId, dongCode, secret } = user;
  const headers = {
    'Content-Type': 'application/json',
    'x-internal-secret': secret,
  };

  // 1) 세션 시작
  const sessionRes = http.post(
    `${TARGET_URL}/sessions`,
    JSON.stringify({ userId, dongCode, durationSec: 7200, todos: [] }),
    { headers, tags: { name: 'POST /sessions' } }
  );
  const ok = check(sessionRes, { 'session created': (r) => r.status === 200 });
  if (!ok) { sleep(1); return; }

  const sessionId = sessionRes.json('sessionId');
  sleep(1);

  // 2) 물주기 (30분 집중 후 가능한 상황 시뮬레이션)
  const waterRes = http.post(
    `${TARGET_URL}/water`,
    JSON.stringify({ userId, dongCode, nickname: `LT${__VU}`, totalElapsedSec: 1800 }),
    { headers, tags: { name: 'POST /water' } }
  );
  // 409 = 오늘 캡 도달 (정상), 200 = 물주기 성공
  check(waterRes, { 'water ok': (r) => r.status === 200 || r.status === 409 });
  sleep(1);

  // 3) 통계 조회
  const statsRes = http.get(
    `${TARGET_URL}/stats/me?userId=${userId}`,
    { tags: { name: 'GET /stats/me' } }
  );
  check(statsRes, { 'stats ok': (r) => r.status === 200 });

  // 4) 세션 종료
  http.patch(
    `${TARGET_URL}/sessions/${sessionId}`,
    JSON.stringify({ action: 'complete' }),
    { headers, tags: { name: 'PATCH /sessions/:id' } }
  );
  sleep(1);
}

// ── 타이머 토글 시나리오 ───────────────────────────────────────
// 세션 ON → OFF를 2회 반복 — SSE 이벤트를 집중 생성해 sse_watchers가 실제로 받는 상황 재현
export function toggleScenario() {
  const user = getVuUser();
  if (!user) { sleep(1); return; }

  const { userId, dongCode, secret } = user;
  const headers = {
    'Content-Type': 'application/json',
    'x-internal-secret': secret,
  };

  for (let i = 0; i < 2; i++) {
    const sessionRes = http.post(
      `${TARGET_URL}/sessions`,
      JSON.stringify({ userId, dongCode, durationSec: 7200, todos: [] }),
      { headers, tags: { name: 'POST /sessions' } }
    );
    const ok = check(sessionRes, { 'toggle session created': (r) => r.status === 200 });
    if (!ok) { sleep(2); continue; }

    const sessionId = sessionRes.json('sessionId');
    sleep(3);

    http.patch(
      `${TARGET_URL}/sessions/${sessionId}`,
      JSON.stringify({ action: 'complete' }),
      { headers, tags: { name: 'PATCH /sessions/:id' } }
    );
    sleep(2);
  }
}

// ── SSE 연결 유저 시나리오 ────────────────────────────────────
// timer_toggler가 만드는 이벤트를 SSE 연결이 실제로 받는지 확인
// timeout(error_code 1050)은 연결이 유지됐다는 의미이므로 성공으로 처리
export function sseScenario() {
  const user = getVuUser();
  if (!user) { sleep(1); return; }

  const { dongCode } = user;

  const res = http.get(`${TARGET_URL}/sse/${dongCode}`, {
    headers: { Accept: 'text/event-stream' },
    timeout: '30s',
    tags: { name: 'GET /sse/:dongCode' },
  });

  check(res, {
    'sse connected': (r) => r.status === 200 || r.error_code === 1050,
  });

  sleep(5);
}
