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
  waterCount: number;
  creatureStage: number;
  sessionStatus: 'RUNNING' | 'PAUSED' | 'IDLE';
  todos: Todo[];
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
