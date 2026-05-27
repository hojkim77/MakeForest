import type { Todo } from './session';

// SSE 이벤트 타입 (Express → Client)
export type SSEEventType = 'dong:users' | 'heatmap:update' | 'water:toast' | 'session:toast' | 'users:overlay' | 'ping' | 'poke:received' | 'friend:request:incoming' | 'friend:accepted' | 'friend:status:changed';

export interface ActiveUser {
  nickname: string;
  elapsedSec: number;
  todos: Todo[];
}

export interface DongUsersPayload {
  regionCode: string;
  users: ActiveUser[];
}

export interface HeatmapUpdatePayload {
  [dongCode: string]: number;
}

export interface CollectionProgress {
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
  collectionProgress?: CollectionProgress;
}

export interface MapUser {
  userId: string;
  nickname: string;
  dongCode: string;
  pixelX: number;
  pixelY: number;
  totalWaterCount: number; // 생애 누적 물주기 횟수 (stage 계산용)
  todayWaterCount: number; // 오늘 물주기 횟수 (표시·순위용, 최대 12)
  creatureStage: number;
  sessionStatus: 'RUNNING' | 'COMPLETE' | 'IDLE';
  todos: Todo[];
  neighborhoodRank: number; // 같은 동 내 오늘 물주기 순위 (1-based)
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

export type SSEPayload =
  | DongUsersPayload
  | HeatmapUpdatePayload
  | WaterToastPayload
  | SessionToastPayload
  | UsersOverlayPayload
  | PokeReceivedSSEPayload
  | FriendRequestIncomingSSEPayload
  | FriendAcceptedSSEPayload
  | FriendStatusChangedPayload;

export interface SSEEvent {
  type: SSEEventType;
  data: SSEPayload;
}
