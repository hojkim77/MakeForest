import http from 'k6/http';
import { check, sleep } from 'k6';

const TARGET_URL = __ENV.TARGET_URL || 'http://localhost:4000';
const INTERNAL_SECRET = __ENV.INTERNAL_SECRET || '';
const MAIN_VUS = parseInt(__ENV.MAIN_VUS || '10');
const MYPAGE_VUS = parseInt(__ENV.MYPAGE_VUS || '5');
const DURATION = __ENV.DURATION || '2m';

export const options = {
  scenarios: {
    // S1: 메인페이지 유저 플로우
    // 세션 생명주기 + 물주기 write 경로 회귀 감지
    // broadcastToRegion / broadcastHeatmap 비용이 PATCH/POST 응답 시간에 반영됨
    main_users: {
      executor: 'constant-vus',
      vus: MAIN_VUS,
      duration: DURATION,
      exec: 'mainUserScenario',
    },
    // S2: 마이페이지 stats 조회
    // streak·rank·weekly·Fossil 집계 쿼리 회귀 감지
    mypage_users: {
      executor: 'constant-vus',
      vus: MYPAGE_VUS,
      duration: DURATION,
      exec: 'mypageUserScenario',
    },
  },
  thresholds: {
    // CI 환경(server/DB/Redis 동일 VM) 기준 — 치명적 장애 감지용
    // 절대 수치가 아닌 baseline 대비 변화율로 회귀를 판단 (post-result.js)
    'http_req_duration{scenario:main_users}':   ['p(95)<3000'],
    'http_req_failed{scenario:main_users}':     ['rate<0.05'],
    'http_req_duration{scenario:mypage_users}': ['p(95)<2000'],
    'http_req_failed{scenario:mypage_users}':   ['rate<0.05'],
    // name 태그 임계값 → result.json에 해당 메트릭이 반드시 포함됨
    'http_req_duration{name:GET /stats/me}':    ['p(95)<1500'],
  },
};

// VU당 캐시 — 첫 iteration에 /test/login 호출 후 재사용
// waterCount: 12회 도달 시 /water 호출 안 함 (비즈니스 로직 재현)
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
    userId:     res.json('userId'),
    dongCode:   res.json('dongCode'),
    regionCode: res.json('regionCode'),
    secret:     res.json('secret') || INTERNAL_SECRET,
    waterCount: 0,
  };

  return vuCache[__VU];
}

// ── S1: 메인페이지 유저 플로우 ─────────────────────────────────
// POST /sessions → PATCH pause → PATCH resume → POST /water → GET /creature → PATCH complete
// 각 단계에서 발생하는 브로드캐스트 비용이 응답 latency에 반영됨
export function mainUserScenario() {
  const user = getVuUser();
  if (!user) { sleep(1); return; }

  const { userId, dongCode, regionCode, secret } = user;
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
  if (!ok) { sleep(1); return; }

  const sessionId = sessionRes.json('sessionId');
  sleep(1);

  // 2) 일시정지
  http.patch(
    `${TARGET_URL}/sessions/${sessionId}`,
    JSON.stringify({ action: 'pause' }),
    { headers, tags: { name: 'PATCH /sessions/:id (pause)' } },
  );
  sleep(1);

  // 3) 재개
  http.patch(
    `${TARGET_URL}/sessions/${sessionId}`,
    JSON.stringify({ action: 'resume' }),
    { headers, tags: { name: 'PATCH /sessions/:id (resume)' } },
  );
  sleep(1);

  // 4) 물주기 (12회 미만일 때만)
  //    totalElapsedSec = waterCount * 1800 + 60
  //    → 최대 11 * 1800 + 60 = 19860 < 21600(6시간 캡) — 항상 통과
  //    409 = 12회 초과 or 6시간 캡 → 정상 비즈니스 응답 (실패 아님)
  if (user.waterCount < 12) {
    const totalElapsedSec = user.waterCount * 1800 + 60;
    const waterRes = http.post(
      `${TARGET_URL}/water`,
      JSON.stringify({ userId, dongCode, nickname: `LT${__VU}`, totalElapsedSec }),
      { headers, tags: { name: 'POST /water' } },
    );
    if (waterRes.status === 200) user.waterCount++;
    check(waterRes, { 'water ok': (r) => r.status === 200 || r.status === 409 });
  }
  sleep(1);

  // 5) 숲 모드 — 지역 생명체 집계 조회
  http.get(
    `${TARGET_URL}/creature/${encodeURIComponent(regionCode)}`,
    { tags: { name: 'GET /creature/:regionCode' } },
  );

  // 6) 세션 종료
  http.patch(
    `${TARGET_URL}/sessions/${sessionId}`,
    JSON.stringify({ action: 'complete' }),
    { headers, tags: { name: 'PATCH /sessions/:id (complete)' } },
  );
  sleep(1);
}

// ── S2: 마이페이지 stats 조회 ──────────────────────────────────
// GET /stats/me: streak·rank·weekly·Fossil 복합 집계 쿼리 (Public — 인증 불필요)
// GET /water/me: 오늘 물주기 횟수 단순 조회 (/water 전체가 requireInternalAuth 대상)
// dongCode를 포함해야 neighborhoodRank 집계 경로가 실행됨
export function mypageUserScenario() {
  const user = getVuUser();
  if (!user) { sleep(1); return; }

  const { userId, dongCode, secret } = user;
  const headers = { 'x-internal-secret': secret };

  // 1) stats 집계 쿼리 (핵심 측정 대상) — /stats는 Public이므로 헤더 없어도 동작하나 일관성을 위해 포함
  const statsRes = http.get(
    `${TARGET_URL}/stats/me?userId=${userId}&dongCode=${dongCode}`,
    { headers, tags: { name: 'GET /stats/me' } },
  );
  check(statsRes, { 'stats ok': (r) => r.status === 200 });
  sleep(1);

  // 2) 오늘 물주기 현황 조회 — /water는 requireInternalAuth 대상이므로 헤더 필수
  const waterMeRes = http.get(
    `${TARGET_URL}/water/me?userId=${userId}`,
    { headers, tags: { name: 'GET /water/me' } },
  );
  check(waterMeRes, { 'water/me ok': (r) => r.status === 200 });
  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-test/result.json': JSON.stringify(data),
  };
}
