/**
 * Phase B — Mixed realistic traffic
 *
 * DAU 2000 / 피크타임 1시간 / 30% = 600명 / 20분당 200명 기준 시나리오.
 * Five concurrent groups reflecting real traffic composition:
 *   map_browsers    (2 VUs × 20 iter = 40 calls)   — unauthenticated, GET /map/snapshot only
 *   session_users   (200 VUs × 1 iter, staggered)  — focus+water, 5 VUs per 30s slot
 *   sse_subscribers (200 VUs, ramping)              — SSE connections (requires xk6-sse)
 *   social_users    (30 VUs, constant 20m)          — community feed + reactions + pokes
 *   stats_users     (20 VUs × 10 iter = 200 calls)  — ranking + stats via http.batch
 *
 * Run:
 *   ./k6 run load-test/scenarios/e-mixed-traffic.js          # requires xk6-sse
 *   k6  run load-test/scenarios/e-mixed-traffic.js --env NO_SSE=1  # skip SSE group
 *
 * ENV:
 *   TARGET_URL, INTERNAL_SECRET
 *   NO_SSE      set to '1' to skip sse_subscribers (standard k6 build)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import sse from 'k6/x/sse';
import { getVuUser, authHeaders, getPeerUserId } from '../lib/auth.js';
import { url } from '../lib/endpoints.js';
import {
  waterApiDuration,
  sseConnectionDuration,
  sseEventLatency,
  sseDisconnectRate,
} from '../lib/metrics.js';
import { expectConflict } from '../lib/http.js';

const NO_SSE = __ENV.NO_SSE === '1';
const EMOJIS = ['🔥', '💪', '👏'];

// session_users: 200 VUs staggered in groups of 5 over 40 × 30s slots
const SESSION_VUS = 200;
const SESSION_SLOT_SIZE = 5;
const SESSION_SLOT_SEC = 30;

function buildScenarios() {
  const s = {
    map_browsers: {
      executor: 'per-vu-iterations',
      vus: 2,
      iterations: 20,
      maxDuration: '25m',
      exec: 'mapBrowser',
    },
    session_users: {
      executor: 'per-vu-iterations',
      vus: SESSION_VUS,
      iterations: 1,
      maxDuration: '20m',
      exec: 'sessionUser',
    },
    social_users: {
      executor: 'constant-vus',
      vus: 30,
      duration: '20m',
      exec: 'socialUser',
    },
    stats_users: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 20,
      maxDuration: '25m',
      exec: 'statsUser',
    },
  };

  if (!NO_SSE) {
    s.sse_subscribers = {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },
        { duration: '15m', target: 200 },
      ],
      exec: 'sseSubscriber',
    };
  }

  return s;
}

export const options = {
  scenarios: buildScenarios(),
  thresholds: {
    'http_req_duration{scenario:map_browsers}': ['p(95)<600'], // 2 VU 극소 부하
    'http_req_duration{scenario:session_users}': ['p(95)<800'], // 슬롯당 최대 5 VU
    'http_req_duration{scenario:social_users}': ['p(95)<900'], // feed 베이스라인 800ms + 혼합 부하 버퍼
    'http_req_duration{scenario:stats_users}': ['p(95)<800'], // batch 병렬화, 격리 베이스라인과 동일
    checks: ['rate>0.97'],
    http_req_failed: ['rate<0.02'],
    ...(!NO_SSE
      ? {
          sse_connection_duration: ['p(95)<800'],
          sse_event_latency: ['p(95)<300'],
          sse_disconnect_rate: ['rate<0.01'],
        }
      : {}),
  },
};

export function setup() {
  const res = http.get(url.communityFeed());
  if (res.status === 200) {
    try {
      const posts = res.json('posts') ?? [];
      return {
        postIds: posts
          .slice(0, 10)
          .map((p) => p.id)
          .filter(Boolean),
      };
    } catch (_) {}
  }
  return { postIds: [] };
}

// ── 2 VUs × 20 iter = 40 calls: Map browsers (unauthenticated) ──────────────
// sleep(58) + ~2s API ≈ 60s per iter → 20 iters × 2 VUs = 40 calls in ~20m
export function mapBrowser() {
  http.get(url.mapSnapshot(), { tags: { name: 'GET /map/snapshot' } });
  sleep(58);
}

// ── 200 VUs: Active session users (focus + water) ────────────────────────────
// Staggered in groups of 5 across 40 × 30s slots so all 200 VUs complete
// exactly one iteration within 20 minutes.
// Slot N (0-indexed) starts at N × 30s:
//   Slot 0  → VUs   1–5   start at   0s
//   Slot 1  → VUs   6–10  start at  30s
//   ...
//   Slot 39 → VUs 196–200 start at 1170s (19.5m)
export function sessionUser() {
  const slot = Math.floor((__VU - 1) / SESSION_SLOT_SIZE);
  sleep(slot * SESSION_SLOT_SEC);

  const user = getVuUser();
  if (!user) return;

  const { userId, dongCode, secret } = user;
  const hdrs = authHeaders(secret);

  http.get(`${url.userMe()}?userId=${userId}`, { headers: hdrs, tags: { name: 'GET /user/me' } });
  sleep(Math.random() + 1);

  http.get(url.mapSnapshot(), { headers: hdrs, tags: { name: 'GET /map/snapshot' } });
  sleep(Math.random() + 1);

  const sessionRes = http.post(
    url.sessions(),
    JSON.stringify({ userId, dongCode, durationSec: 7200, todos: [] }),
    { headers: hdrs, tags: { name: 'POST /sessions' } },
  );
  if (!check(sessionRes, { 'session started': (r) => r.status === 200 })) return;
  const sessionId = sessionRes.json('sessionId');

  // Shortened think time: load test API throughput, not UX simulation
  sleep(Math.random() * 5 + 1);

  http.patch(url.session(sessionId), JSON.stringify({ action: 'complete' }), {
    headers: hdrs,
    tags: { name: 'PATCH /sessions/:id' },
  });
  sleep(Math.random() + 1);

  if (user.waterCount < 12) {
    const totalElapsedSec = user.waterCount * 1800 + 60;
    const t0 = Date.now();
    const wr = http.post(
      url.water(),
      JSON.stringify({ userId, dongCode, nickname: `LT${__VU}`, totalElapsedSec }),
      { headers: hdrs, tags: { name: 'POST /water' }, ...expectConflict },
    );
    waterApiDuration.add(Date.now() - t0);
    check(wr, { 'water ok': (r) => r.status === 200 || r.status === 409 });
    if (wr.status === 200) user.waterCount++;
  }

  const toUserId = getPeerUserId((__VU % 200) + 1);
  if (toUserId && toUserId !== userId) {
    http.post(url.pokes(), JSON.stringify({ userId, toUserId }), {
      headers: hdrs,
      tags: { name: 'POST /pokes' },
      ...expectConflict,
    });
  }
}

// ── 200 VUs: SSE subscribers ─────────────────────────────────────────────────
// Ramps: 0→100 over first 5m, then 100→200 over remaining 15m.
export function sseSubscriber() {
  const user = getVuUser();
  if (!user) {
    sleep(1);
    return;
  }

  const { regionCode, secret } = user;
  const connectStart = Date.now();
  let connected = false;

  const deadline = Date.now() + 60_000;
  sse.open(url.sseRegion(regionCode), { headers: { 'x-internal-secret': secret } }, (client) => {
    client.on('open', () => {
      connected = true;
      sseConnectionDuration.add(Date.now() - connectStart);
    });
    client.on('event', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.serverTs) sseEventLatency.add(Date.now() - payload.serverTs);
      } catch (_) {}
      if (Date.now() >= deadline) client.close();
    });
    client.on('error', () => {
      sseDisconnectRate.add(1);
      client.close();
    });
  });

  check({}, { 'SSE connected': () => connected });
  if (!connected) sseDisconnectRate.add(1);
  sleep(1);
}

// ── 30 VUs: Social users ──────────────────────────────────────────────────────
export function socialUser() {
  const user = getVuUser();
  if (!user) {
    sleep(2);
    return;
  }

  const { userId, secret } = user;
  const hdrs = authHeaders(secret);
  let feedRes = [];
  if (Math.random() < 0.6) {
    feedRes = http.get(url.communityFeed(), {
      headers: hdrs,
      tags: { name: 'GET /community/feed' },
    });
    sleep(Math.random() * 3 + 2);
  }

  try {
    const posts = feedRes.json('posts') ?? [];
    if (posts.length > 0) feedRes = posts.slice(0, 5).map((p) => p.id);
  } catch (_) {}

  if (feedRes.length > 0) {
    const postId = feedRes[__VU % feedRes.length];
    const emoji = EMOJIS[__VU % EMOJIS.length];
    if (Math.random() < 0.4) {
      http.post(url.communityReactions(postId), JSON.stringify({ userId, emoji }), {
        headers: hdrs,
        tags: { name: 'POST /community/reactions' },
        ...expectConflict,
      });
    }
    sleep(Math.random() * 2 + 1);

    if (Math.random() < 0.2) {
      http.post(
        url.communityComments(postId),
        JSON.stringify({ userId, content: `LT comment ${__VU}` }),
        { headers: hdrs, tags: { name: 'POST /community/comments' } },
      );
    }
  }

  sleep(Math.random() * 3 + 2);
}

// ── 20 VUs × 10 iter = 200 calls: Stats / ranking viewers (http.batch) ──────
// sleep(58) + ~2s batch ≈ 60s per iter → 10 iters × 20 VUs = 200 calls in ~10m
export function statsUser() {
  const user = getVuUser();
  if (!user) {
    sleep(58);
    return;
  }

  const { userId, dongCode, secret } = user;
  const hdrs = authHeaders(secret);

  http.batch([
    [
      'GET',
      `${url.rankingRegion()}?period=today`,
      null,
      { headers: hdrs, tags: { name: 'GET /ranking/region' } },
    ],
    [
      'GET',
      `${url.statsFocus()}?userId=${userId}`,
      null,
      { headers: hdrs, tags: { name: 'GET /stats/focus' } },
    ],
    [
      'GET',
      `${url.statsWeekly()}?userId=${userId}`,
      null,
      { headers: hdrs, tags: { name: 'GET /stats/weekly' } },
    ],
    [
      'GET',
      `${url.statsRank()}?userId=${userId}&dongCode=${dongCode}`,
      null,
      { headers: hdrs, tags: { name: 'GET /stats/rank' } },
    ],
  ]);

  sleep(58);
}

export function handleSummary(data) {
  const ts = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
  return { [`load-test/results/e-${ts}.json`]: JSON.stringify(data, null, 2) };
}
