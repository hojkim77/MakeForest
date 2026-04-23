import type { Todo } from './session';
import type { ForestObject } from './forest';

// SSE 이벤트 타입 (Express → Client)
export type SSEEventType = 'dong:users' | 'heatmap:update' | 'harvest:new' | 'ping';

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

export type SSEPayload = DongUsersPayload | HeatmapUpdatePayload | HarvestNewPayload;

export interface SSEEvent {
  type: SSEEventType;
  data: SSEPayload;
}
