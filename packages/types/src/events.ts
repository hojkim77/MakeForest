// SSE 이벤트 타입 (Express → Client)
export type SSEEventType = 'dong:users' | 'heatmap:update' | 'water:toast' | 'session:toast' | 'users:overlay' | 'ping' | 'poke:received' | 'friend:request:incoming' | 'friend:accepted' | 'friend:status:changed' | 'mission:complete';

export interface ActiveUser {
  nickname: string;
  elapsedSec: number;
}

export interface DongUsersPayload {
  regionCode: string;
  users: ActiveUser[];
}

export interface HeatmapUpdatePayload {
  [dongCode: string]: number;
}

export interface MissionProgress {
  creatureType: string;
  currentCount: number;
  targetCount: number;
  isCompleted: boolean;
}

export interface WaterToastPayload {
  dongCode: string;
  nickname: string;
}

export interface SessionToastPayload {
  dongCode: string;
  nickname: string;
  missionProgress?: MissionProgress;
}

export interface MapUser {
  userId: string;
  nickname: string;
  dongCode: string;
  pixelX: number;
  pixelY: number;
  totalWaterCount: number;   // derived: floor(totalFocusMinutes/30)
  totalFocusMinutes: number; // canonical growth unit
  todayWaterCount: number;   // 오늘 물주기 횟수 (표시·순위용)
  creatureStage: number;
  sessionStatus: 'RUNNING' | 'COMPLETE' | 'IDLE';
  focusLengthMin: number;    // 오늘 집중 시간 설정 (분)
  segmentCount: number;      // 오늘 반복 횟수 설정
  todayGoal: string | null;  // 오늘의 목표 (fallback: "오늘의 목표 작성 전")
  neighborhoodRank: number;  // 같은 동 내 오늘 물주기 순위 (1-based)
}

export type UsersOverlayPayload = MapUser[];

export interface PokeReceivedSSEPayload {
  pokeId: string;
  fromUserId: string;
  fromNickname: string;
  createdAt: string;
  unreadCount: number;
}

export interface FriendRequestIncomingSSEPayload {
  friendshipId: string;
  requester: { userId: string; nickname: string; dongName: string | null };
}

export interface FriendAcceptedSSEPayload {
  friendshipId: string;
  friend: { userId: string; nickname: string; dongName: string | null };
}

export interface FriendStatusChangedPayload {
  userId: string;
  status: 'RUNNING' | 'IDLE' | 'OFFLINE';
}

export interface MissionCompletePayload {
  rewardedUserIds: string[];
  bonusMinutes: number;
}

export type SSEPayload =
  | DongUsersPayload
  | HeatmapUpdatePayload
  | WaterToastPayload
  | SessionToastPayload
  | UsersOverlayPayload
  | PokeReceivedSSEPayload
  | FriendRequestIncomingSSEPayload
  | FriendAcceptedSSEPayload
  | FriendStatusChangedPayload
  | MissionCompletePayload;

export interface SSEEvent {
  type: SSEEventType;
  data: SSEPayload;
}
