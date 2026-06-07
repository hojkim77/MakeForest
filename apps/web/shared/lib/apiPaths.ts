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
  TODOS: () => '/api/todos',
  TODO: (id: string) => `/api/todos/${id}`,
  SERVER_TODOS: (userId: string, date: string) => `${S}/todos?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`,
  USER_ME: () => '/api/user/me',
  LOCATION_SEARCH: (q: string) => `/api/location/search?q=${encodeURIComponent(q)}`,
  LOCATION_DETECT: (lat: number, lng: number) => `/api/location/detect?lat=${lat}&lng=${lng}`,
  PUSH_NOTIFY: () => '/api/push/notify',
  SERVER_MISSION_TODAY: (regionCode: string) => `${S}/mission/today?regionCode=${encodeURIComponent(regionCode)}`,
  SERVER_MISSION_COMPLETED: (regionCode: string) => `${S}/mission/completed?regionCode=${encodeURIComponent(regionCode)}`,
  SERVER_COMMUNITY_FEED: (params: string) => `${S}/community/feed?${params}`,
  SERVER_RANKING_DONG: (period: string) => `${S}/ranking/dong?period=${period}`,
  SERVER_RANKING_REGION: (period: string, myDongCode?: string) =>
    `${S}/ranking/region?period=${period}${myDongCode ? `&myDongCode=${myDongCode}` : ''}`,
  LOCATION_REGIONS: () => '/api/location/regions',
  COMMUNITY_FEED: () => '/api/community/feed',
  COMMUNITY_MY_REACTIONS: () => '/api/community/my-reactions',
  COMMUNITY_REACTIONS: (postId: string) => `/api/community/${postId}/reactions`,
  COMMUNITY_COMMENTS: (postId: string) => `/api/community/${postId}/comments`,
  // Friends
  FRIENDS: () => '/api/friends',
  FRIENDS_SEARCH: (nickname: string) => `/api/friends/search?nickname=${encodeURIComponent(nickname)}`,
  FRIENDS_REQUESTS: () => '/api/friends/requests',
  FRIENDS_REQUEST: (friendshipId: string) => `/api/friends/requests/${friendshipId}`,
  FRIEND: (userId: string) => `/api/friends/${userId}`,
  // Pokes
  POKES: () => '/api/pokes',
  POKES_INBOX: () => '/api/pokes/inbox',
  POKES_INBOX_READ: () => '/api/pokes/inbox/read',
  // Points
  POINTS_ME: () => '/api/points/me',
  // SSE user stream
  SSE_USER_STREAM: () => '/api/sse/user-stream',
  // Guide
  GUIDE_TOUR_COMPLETE: () => '/api/guide/tour/complete',
  GUIDE_DAILY_DISMISS: () => '/api/guide/daily/dismiss',
} as const;
