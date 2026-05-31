import { BASE_URL } from '../config/environments.js';

export const url = {
  // Auth / user
  userMe:           () => `${BASE_URL}/user/me`,

  // Sessions
  sessions:         () => `${BASE_URL}/sessions`,
  session:      (id) => `${BASE_URL}/sessions/${id}`,
  sessionsToday:    () => `${BASE_URL}/sessions/today`,

  // Water / points
  water:            () => `${BASE_URL}/water`,
  waterMe:          () => `${BASE_URL}/water/me`,
  pointsMe:         () => `${BASE_URL}/points/me`,

  // Friends
  friends:          () => `${BASE_URL}/friends`,
  friendRequests:   () => `${BASE_URL}/friends/requests`,
  friendRequest: (id) => `${BASE_URL}/friends/requests/${id}`,
  friendSearch:     () => `${BASE_URL}/friends/search`,

  // Pokes
  pokes:            () => `${BASE_URL}/pokes`,
  pokesInbox:       () => `${BASE_URL}/pokes/inbox`,
  pokesRead:        () => `${BASE_URL}/pokes/inbox/read`,

  // Map
  mapSnapshot:      () => `${BASE_URL}/map/snapshot`,

  // Ranking / stats / collection
  rankingRegion:    () => `${BASE_URL}/ranking/region`,
  statsFocus:       () => `${BASE_URL}/stats/focus`,
  statsWeekly:      () => `${BASE_URL}/stats/weekly`,
  statsRank:        () => `${BASE_URL}/stats/rank`,
  collectionToday:  () => `${BASE_URL}/collection/today`,

  // Community
  communityFeed:              () => `${BASE_URL}/community/feed`,
  communityMyReactions:       () => `${BASE_URL}/community/my-reactions`,
  communityReactions: (pid) => `${BASE_URL}/community/${pid}/reactions`,
  communityComments:  (pid) => `${BASE_URL}/community/${pid}/comments`,

  // Guide
  guideState:               () => `${BASE_URL}/guide/state`,

  // Creature
  creature:     (rc) => `${BASE_URL}/creature/${encodeURIComponent(rc)}`,

  // SSE
  sseActivity:          () => `${BASE_URL}/sse/activity-stream`,
  sseRegion:        (rc) => `${BASE_URL}/sse/activity-stream/regionCode/${encodeURIComponent(rc)}`,

  // Admin utils
  adminRunMidnight: () => `${BASE_URL}/admin/run-midnight`,
};
