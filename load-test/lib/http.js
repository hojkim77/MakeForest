import http from 'k6/http';

// water cooldown / duplicate reaction / poke cooldown은 의도된 409 — http_req_failed 집계 제외
export const expectConflict = {
  responseCallback: http.expectedStatuses({ min: 200, max: 399 }, 409),
};
