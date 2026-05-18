const S = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

export const API_PATHS = {
  // Express 서버 직접 (서버 컴포넌트 / hooks)
  SERVER_USER_ME: (userId: string) => `${S}/user/me?userId=${userId}`,
  SERVER_STATS_FOCUS: (userId: string) => `${S}/stats/focus?userId=${userId}`,
  SERVER_STATS_RANK: (params: string) => `${S}/stats/rank?${params}`,
  SERVER_STATS_WEEKLY: (userId: string) => `${S}/stats/weekly?userId=${userId}`,
  SERVER_MAP_SNAPSHOT: () => `${S}/map/snapshot`,
  SERVER_CREATURE: (rc: string) => `${S}/creature/${encodeURIComponent(rc)}`,
  SERVER_WATER_ME: (userId: string, date: string) => `${S}/water/me?userId=${userId}&date=${date}`,
  SERVER_SESSION_TODAY: (userId: string) => `${S}/sessions/today?userId=${userId}`,
  SERVER_SSE_ACTIVITY: () => `${S}/sse/activity-stream`,
  SERVER_SSE_REGION: (rc: string) => `${S}/sse/activity-stream/regionCode/${encodeURIComponent(rc)}`,
  // Next.js API 라우트 (클라이언트 컴포넌트)
  WATER: () => '/api/water',
  WATER_ME: () => '/api/water/me',
  SESSIONS: () => '/api/sessions',
  SESSION: (id: string) => `/api/sessions/${id}`,
  SESSION_TODOS: (id: string) => `/api/sessions/${id}/todos`,
  USER_ME: () => '/api/user/me',
  LOCATION_SEARCH: (q: string) => `/api/location/search?q=${encodeURIComponent(q)}`,
  LOCATION_DETECT: (lat: number, lng: number) => `/api/location/detect?lat=${lat}&lng=${lng}`,
  MAP_FOSSILS: (dongCode: string) => `/api/map/${dongCode}`,
  PUSH_NOTIFY: () => '/api/push/notify',
  SERVER_COLLECTION_TODAY: (regionCode: string) => `${S}/collection/today?regionCode=${encodeURIComponent(regionCode)}`,
  SERVER_COLLECTION_COMPLETED: (regionCode: string) => `${S}/collection/completed?regionCode=${encodeURIComponent(regionCode)}`,
  SERVER_COMMUNITY_FEED: (params: string) => `${S}/community/feed?${params}`,
  SERVER_RANKING_DONG: (period: string) => `${S}/ranking/dong?period=${period}`,
  SERVER_RANKING_REGION: (period: string, myDongCode?: string) =>
    `${S}/ranking/region?period=${period}${myDongCode ? `&myDongCode=${myDongCode}` : ''}`,
  LOCATION_REGIONS: () => '/api/location/regions',
  COMMUNITY_FEED: () => '/api/community/feed',
  COMMUNITY_REACTIONS: (postId: string) => `/api/community/${postId}/reactions`,
  COMMUNITY_COMMENTS: (postId: string) => `/api/community/${postId}/comments`,
} as const;
