import { SharedArray } from 'k6/data';
import { INTERNAL_SECRET } from '../config/environments.js';

// Loaded once at init time, shared across all VUs (k6 recommended pattern).
// Path is relative to the k6 working directory (project root).
const users = new SharedArray('users', function () {
  return JSON.parse(open('../users.json'));
});

// Per-VU cache: populated on first iteration, reused throughout the VU lifetime.
const vuCache = {};

export function getVuUser() {
  if (vuCache[__VU]) return vuCache[__VU];

  if (users.length === 0) {
    console.error('users.json is empty — run: yarn load:seed');
    return null;
  }

  const u = users[(__VU - 1) % users.length];

  vuCache[__VU] = {
    userId:     u.id,
    dongCode:   u.dongCode,
    regionCode: u.regionCode,
    secret:     INTERNAL_SECRET,
    waterCount: 0,
  };

  return vuCache[__VU];
}

export function authHeaders(secret) {
  return {
    'Content-Type': 'application/json',
    'x-internal-secret': secret,
  };
}

// Returns the userId of an adjacent load-test user from the SharedArray.
// Ring friendship: user[i] is friends with user[(i+1)%N], so VU N's peer is index N%N.
export function getPeerUserId(vuNum) {
  if (users.length === 0) return null;
  return users[(vuNum - 1) % users.length]?.id ?? null;
}
