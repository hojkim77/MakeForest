// Redis 키 네이밍 컨벤션 중앙 관리

export const RedisKeys = {
  session: (sessionId: string) => `session:${sessionId}`,
  dongActive: (dongCode: string) => `dong:${dongCode}:active`,
  dongUserCount: (dongCode: string) => `dong:${dongCode}:count`,
  heatmapSido: (sidoCode: string) => `heatmap:sido:${sidoCode}`,
  heatmapSigungu: (sigunguCode: string) => `heatmap:sigungu:${sigunguCode}`,
  heatmapDong: () => `heatmap:dong`,
  overlayDailySessions: (date: string) => `overlay:sessions:${date}`,
  collection: (dongCode: string, date: string) => `collection:${dongCode}:${date}`,
  userSession: (userId: string) => `user:${userId}:session`,
} as const;

export const SESSION_TTL_SECONDS = 25 * 60 * 60; // 25시간
