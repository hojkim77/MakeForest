import type { Todo } from './session';

// SSE 이벤트 타입 (Express → Client)
export type SSEEventType = 'dong:users' | 'heatmap:update' | 'water:toast' | 'creature:update' | 'ping';

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

export interface CreatureUpdatePayload {
  dongCode: string;
  stage: number;
  waterCount: number;
}

export type SSEPayload =
  | DongUsersPayload
  | HeatmapUpdatePayload
  | WaterToastPayload
  | CreatureUpdatePayload;

export interface SSEEvent {
  type: SSEEventType;
  data: SSEPayload;
}
