/**
 * Phase A — Page-based SLO baseline
 *
 * Run:
 *   k6 run load-test/scenarios/a-single-endpoint.js
 *   k6 run load-test/scenarios/a-single-endpoint.js --env GROUP=main_write
 *
 * ENV:
 *   TARGET_URL        server base URL (default: http://localhost:4000)
 *   INTERNAL_SECRET   x-internal-secret value
 *   GROUP             main_read | main_write | mypage_read | community_read | community_write | all (default: all)
 *   VUS               VUs per group (default: 50)
 *   DURATION          duration per group (default: 3m)
 *
 * GROUP=all runs groups sequentially in this order:
 *   main_read → main_write → mypage_read → community_read → community_write
 *
 * Ordering rationale: POST /sessions creates a community post, so community_*
 * groups run after main_write has had time to populate the feed.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getVuUser, authHeaders } from '../lib/auth.js';
import { url } from '../lib/endpoints.js';
import { waterApiDuration } from '../lib/metrics.js';
import { ENDPOINT_THRESHOLDS } from '../config/thresholds.js';
import { expectConflict } from '../lib/http.js';

const GROUP = __ENV.GROUP || 'all';
const VUS = parseInt(__ENV.VUS || '50');
const DURATION = __ENV.DURATION || '3m';

const EMOJIS = ['🔥', '💪', '👏'];

const GROUP_ORDER = ['main_read', 'main_write', 'mypage_read', 'community_read', 'community_write'];

function parseDurationSec(d) {
  if (d.endsWith('m')) return parseInt(d) * 60;
  if (d.endsWith('s')) return parseInt(d);
  return 180;
}

function buildScenarios() {
  const active = GROUP === 'all' ? GROUP_ORDER : [GROUP];
  const stepSec = parseDurationSec(DURATION) + 10;

  const scenarios = {};
  active.forEach((g, i) => {
    scenarios[g] = {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      exec: g,
      startTime: GROUP === 'all' ? `${i * stepSec}s` : '0s',
    };
  });
  return scenarios;
}

export const options = {
  scenarios: buildScenarios(),
  thresholds: {
    // per-scenario SLO (page-group aggregate)
    'http_req_duration{scenario:main_read}': ['p(95)<800'],
    'http_req_duration{scenario:main_write}': ['p(95)<700'],
    'http_req_duration{scenario:mypage_read}': ['p(95)<600'],
    'http_req_duration{scenario:community_read}': ['p(95)<800'],
    'http_req_duration{scenario:community_write}': ['p(95)<600'],
    // per-endpoint SLO (canonical baseline — see config/thresholds.js)
    ...ENDPOINT_THRESHOLDS,
    http_req_failed: ['rate<0.01'],
  },
};

// ── 1. 메인페이지 READ ────────────────────────────────────────────────────────
export function main_read() {
  const user = getVuUser();
  if (!user) {
    sleep(1);
    return;
  }
  const { userId, secret } = user;
  const hdrs = authHeaders(secret);

  http.batch([
    ['GET', url.mapSnapshot(), null, { tags: { name: 'GET /map/snapshot' } }],
    [
      'GET',
      `${url.userMe()}?userId=${userId}`,
      null,
      { headers: hdrs, tags: { name: 'GET /user/me' } },
    ],
    [
      'GET',
      `${url.waterMe()}?userId=${userId}`,
      null,
      { headers: hdrs, tags: { name: 'GET /water/me' } },
    ],
    [
      'GET',
      `${url.guideState()}?userId=${userId}`,
      null,
      { headers: hdrs, tags: { name: 'GET /guide/state' } },
    ],
  ]);
  sleep(2);
}

// ── 2. 메인페이지 WRITE ───────────────────────────────────────────────────────
export function main_write() {
  const user = getVuUser();
  if (!user) {
    sleep(1);
    return;
  }
  const { userId, dongCode, secret } = user;
  const hdrs = authHeaders(secret);

  const sessionRes = http.post(
    url.sessions(),
    JSON.stringify({ userId, dongCode, durationSec: 7200, todos: [] }),
    { headers: hdrs, tags: { name: 'POST /sessions' } },
  );
  const sessionOk = check(sessionRes, { 'session started': (r) => r.status === 200 });
  if (!sessionOk) {
    sleep(1);
    return;
  }

  const sessionId = sessionRes.json('sessionId');
  sleep(1);

  if (user.waterCount < 12 && __ITER % 2 === 0) {
    const totalElapsedSec = user.waterCount * 1800 + 60;
    const t0 = Date.now();
    const waterRes = http.post(
      url.water(),
      JSON.stringify({ userId, dongCode, nickname: `LT${__VU}`, totalElapsedSec }),
      { headers: hdrs, tags: { name: 'POST /water' }, ...expectConflict },
    );
    waterApiDuration.add(Date.now() - t0);
    check(waterRes, { 'water ok': (r) => r.status === 200 || r.status === 409 });
    if (waterRes.status === 200) user.waterCount++;
  }
  sleep(1);

  if (sessionId) {
    http.patch(url.session(sessionId), JSON.stringify({ action: 'complete' }), {
      headers: hdrs,
      tags: { name: 'PATCH /sessions/:id' },
    });
  }
  sleep(2);
}

// ── 3. 마이페이지 READ ────────────────────────────────────────────────────────
export function mypage_read() {
  const user = getVuUser();
  if (!user) {
    sleep(1);
    return;
  }
  const { userId, dongCode, secret } = user;
  const hdrs = authHeaders(secret);

  http.batch([
    [
      'GET',
      `${url.userMe()}?userId=${userId}`,
      null,
      { headers: hdrs, tags: { name: 'GET /user/me' } },
    ],
    [
      'GET',
      `${url.statsFocus()}?userId=${userId}`,
      null,
      { headers: hdrs, tags: { name: 'GET /stats/focus' } },
    ],
    [
      'GET',
      `${url.statsRank()}?userId=${userId}&dongCode=${dongCode}`,
      null,
      { headers: hdrs, tags: { name: 'GET /stats/rank' } },
    ],
    [
      'GET',
      `${url.statsWeekly()}?userId=${userId}`,
      null,
      { headers: hdrs, tags: { name: 'GET /stats/weekly' } },
    ],
  ]);
  sleep(2);
}

// ── 4. 커뮤니티페이지 READ ────────────────────────────────────────────────────
export function community_read() {
  const user = getVuUser();
  if (!user) {
    sleep(1);
    return;
  }
  const { userId, secret } = user;
  const hdrs = authHeaders(secret);

  const feedRes = http.get(url.communityFeed(), { tags: { name: 'GET /community/feed' } });
  check(feedRes, { 'feed 200': (r) => r.status === 200 });

  let items = [];
  let nextCursor = null;
  try {
    items = feedRes.json('items') ?? [];
  } catch (_) {}

  if (items.length === 0) {
    sleep(2);
    return;
  }

  const postId = items[0].id;
  http.batch([
    [
      'GET',
      `${url.communityMyReactions()}?postIds=${postId}&userId=${userId}`,
      null,
      { headers: hdrs, tags: { name: 'GET /community/my-reactions' } },
    ],
    [
      'GET',
      `${url.communityComments(postId)}?userId=${userId}`,
      null,
      { tags: { name: 'GET /community/comments' } },
    ],
    ['GET', `${url.rankingRegion()}?period=today`, null, { tags: { name: 'GET /ranking/region' } }],
  ]);
  sleep(2);
}

// ── 5. 커뮤니티페이지 WRITE ───────────────────────────────────────────────────
export function community_write() {
  const user = getVuUser();
  if (!user) {
    sleep(1);
    return;
  }
  const { userId, secret } = user;
  const hdrs = authHeaders(secret);

  const feedRes = http.get(url.communityFeed(), { tags: { name: 'GET /community/feed' } });
  let postIds = [];
  try {
    postIds = (feedRes.json('items') ?? []).map((p) => p.id);
  } catch (_) {}
  if (postIds.length === 0) {
    sleep(3);
    return;
  }
  sleep(1);

  const postId = postIds[Math.floor(Math.random() * postIds.length)];
  const emoji = EMOJIS[__ITER % EMOJIS.length];

  http.post(url.communityReactions(postId), JSON.stringify({ userId, emoji }), {
    headers: hdrs,
    tags: { name: 'POST /community/reactions' },
    ...expectConflict,
  });
  sleep(1);

  // Write comment on every other iteration to avoid flooding
  if (__ITER % 2 === 0) {
    http.post(
      url.communityComments(postId),
      JSON.stringify({ userId, content: `부하테스트 VU=${__VU} iter=${__ITER}` }),
      { headers: hdrs, tags: { name: 'POST /community/comments' } },
    );
  }
  sleep(1);
}

export function handleSummary(data) {
  const ts = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
  return { [`load-test/results/a-${ts}.json`]: JSON.stringify(data, null, 2) };
}
