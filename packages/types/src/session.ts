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
  date: string;
  startedAt: Date;
  totalElapsedSec: number;
  waterCount: number;
  todos: Todo[];
  status: SessionStatus;
}

export interface CreateSessionInput {
  dongCode: string;
  todos: Todo[];
}

// complete: 30분 사이클 완료 / abandon: 자정 배치 등 강제 종료
export type SessionAction = 'abandon' | 'complete';

export interface ActiveSessionCache {
  userId: string;
  dongCode: string;
  startedAt: string;
  todos: Todo[];
  status: SessionStatus | 'IDLE';
  nickname: string;
  pixelX: number;
  pixelY: number;
  totalWaterCount: number;  // 생애 누적
  todayWaterCount: number;  // 오늘 물주기 횟수
  creatureStage: number;
  todosPublic: boolean;
}
