import type { Todo } from './session';
import type { ForestObject } from './forest';

// SSE 이벤트 타입 (Express → Client)
export type SSEEventType = 'dong:users' | 'heatmap:update' | 'harvest:new' | 'water:toast' | 'creature:update' | 'ping';

export interface ActiveUser {
  nickname: string;
  elapsedSec: number;
  todos: Todo[];
}

export interface DongUsersPayload {
  dongCode: string;
  users: ActiveUser[];
}

export interface HeatmapUpdatePayload {
  [dongCode: string]: number;
}

export interface HarvestNewPayload {
  dongCode: string;
  forestObject: ForestObject;
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
  | HarvestNewPayload
  | WaterToastPayload
  | CreatureUpdatePayload;

export interface SSEEvent {
  type: SSEEventType;
  data: SSEPayload;
}
