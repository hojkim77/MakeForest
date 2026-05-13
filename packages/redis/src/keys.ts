// Redis 키 네이밍 컨벤션 중앙 관리

export const RedisKeys = {
  session: (sessionId: string) => `session:${sessionId}`,
  dongActive: (dongCode: string) => `dong:${dongCode}:active`,
  dongUserCount: (dongCode: string) => `dong:${dongCode}:count`,
heatmapSido: (sidoCode: string) => `heatmap:sido:${sidoCode}`,
  heatmapSigungu: (sigunguCode: string) => `heatmap:sigungu:${sigunguCode}`,
  heatmapDong: () => `heatmap:dong`,
  overlayDailySessions: (date: string) => `overlay:sessions:${date}`,
} as const;

export const SESSION_TTL_SECONDS = 6 * 60 * 60; // 6시간
