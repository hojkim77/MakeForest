import type { Todo } from './session';

// SSE 이벤트 타입 (Express → Client)
export type SSEEventType = 'dong:users' | 'heatmap:update' | 'water:toast' | 'users:overlay' | 'ping';

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

export interface WaterToastPayload {
  dongCode: string;
  nickname: string;
}

export interface MapUser {
  userId: string;
  nickname: string;
  dongCode: string;
  pixelX: number;
  pixelY: number;
  waterCount: number;      // 생애 누적 물주기 횟수 (stage 계산용)
  todayWaterCount: number; // 오늘 물주기 횟수 (표시·순위용, 최대 12)
  creatureStage: number;
  sessionStatus: 'RUNNING' | 'IDLE';
  todos: Todo[];
  neighborhoodRank: number; // 같은 동 내 오늘 물주기 순위 (1-based)
}

export type UsersOverlayPayload = MapUser[];

export type SSEPayload =
  | DongUsersPayload
  | HeatmapUpdatePayload
  | WaterToastPayload
  | UsersOverlayPayload;

export interface SSEEvent {
  type: SSEEventType;
  data: SSEPayload;
}
