export type SessionStatus =
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'HARVESTED'
  | 'ABANDONED';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export interface FocusSession {
  id: string;
  userId: string;
  dongCode: string;
  startedAt: Date;
  endedAt?: Date;
  durationSec: number;
  actualSec?: number;
  todos: Todo[];
  status: SessionStatus;
}

export interface CreateSessionInput {
  durationSec: number;
  dongCode: string;
  todos: Todo[];
}

export type SessionAction = 'pause' | 'resume' | 'abandon' | 'complete';

export interface ActiveSessionCache {
  userId: string;
  dongCode: string;
  startedAt: string;
  durationSec: number;
  todos: Todo[];
  status: SessionStatus;
  nickname: string;
  pixelX: number;
  pixelY: number;
  waterCount: number;
  creatureStage: number;
  todosPublic: boolean;
}
