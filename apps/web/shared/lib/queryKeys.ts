export const qk = {
  map: {
    snapshot: () => ['map', 'snapshot'] as const,
    pixel: () => ['map', 'pixel'] as const,
  },
  water: {
    me: (userId: string, kstDate: string) => ['water', 'me', userId, kstDate] as const,
  },
  sessions: {
    today: (userId: string, kstDate: string) => ['sessions', 'today', userId, kstDate] as const,
    todayState: (userId: string, kstDate: string) => ['sessions', 'todayState', userId, kstDate] as const,
  },
  mission: {
    today: (regionCode: string, kstDate: string) => ['mission', 'today', regionCode, kstDate] as const,
    completed: (regionCode: string) => ['mission', 'completed', regionCode] as const,
  },
  community: {
    feedBase: () => ['community', 'feed'] as const,
    feed: (filters: { period: string; sort: string; regionKey: string }) =>
      ['community', 'feed', filters] as const,
    myReactionsBase: () => ['community', 'my-reactions'] as const,
    myReactions: (postIds: string[]) => ['community', 'my-reactions', postIds.sort().join(',')] as const,
    comments: (postId: string) => ['community', 'comments', postId] as const,
  },
  ranking: {
    region: (period: string, myDongCode?: string) =>
      ['ranking', 'region', period, myDongCode ?? null] as const,
    dong: (period: string) => ['ranking', 'dong', period] as const,
  },
  guide: { state: () => ['guide', 'state'] as const },
  location: { regions: () => ['location', 'regions'] as const },
  friends: {
    list: (userId: string) => ['friends', 'list', userId] as const,
    incoming: (userId: string) => ['friends', 'incoming', userId] as const,
    search: (nickname: string) => ['friends', 'search', nickname] as const,
  },
  pokes: {
    inbox: (userId: string) => ['pokes', 'inbox', userId] as const,
  },
  points: {
    me: (userId: string) => ['points', 'me', userId] as const,
  },
  todos: {
    byDate: (userId: string, date: string) => ['todos', userId, date] as const,
  },
  user: {
    me: (userId: string) => ['user', 'me', userId] as const,
  },
  stats: {
    focus: (userId: string) => ['stats', 'focus', userId] as const,
    rank: (userId: string, dongCode?: string) => ['stats', 'rank', userId, dongCode ?? null] as const,
    weekly: (userId: string) => ['stats', 'weekly', userId] as const,
  },
} as const;
