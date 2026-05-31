// Per-endpoint SLO baselines — established by Scenario A (50 VUs, isolated load).
// Spread into scenario thresholds only when testing endpoints in isolation.
// For multi-scenario load tests (B–E), use scenario/journey-level thresholds instead.
export const ENDPOINT_THRESHOLDS = {
  'http_req_duration{name:GET /map/snapshot}': ['p(95)<800'],
  'http_req_duration{name:GET /user/me}': ['p(95)<200'],
  'http_req_duration{name:GET /water/me}': ['p(95)<400'],
  'http_req_duration{name:POST /sessions}': ['p(95)<500'],
  'http_req_duration{name:PATCH /sessions/:id}': ['p(95)<500'],
  'http_req_duration{name:POST /water}': ['p(95)<700'],
  'http_req_duration{name:GET /stats/rank}': ['p(95)<600'],
  'http_req_duration{name:GET /community/feed}': ['p(95)<800'],
  'http_req_duration{name:GET /ranking/region}': ['p(95)<800'],
  'http_req_duration{name:POST /community/reactions}': ['p(95)<500'],
  'http_req_duration{name:POST /community/comments}': ['p(95)<700'],
};
