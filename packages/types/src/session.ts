import { z } from 'zod';

export const TodoSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

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
  status: SessionStatus;
}

export interface CreateSessionInput {
  dongCode: string;
}

// complete: 30분 사이클 완료 / abandon: 자정 배치 등 강제 종료
export type SessionAction = 'abandon' | 'complete';

export interface ActiveSessionCache {
  userId: string;
  dongCode: string;
  startedAt: string;
  status: SessionStatus | 'IDLE';
  nickname: string;
  pixelX: number;
  pixelY: number;
  totalWaterCount: number;   // derived: floor(totalFocusMinutes/30)
  totalFocusMinutes: number; // canonical growth unit
  todayWaterCount: number;   // 오늘 물주기 횟수
  creatureStage: number;
  todosPublic: boolean;
  focusLengthMin: number;    // 오늘 집중 시간 설정 (분)
  segmentCount: number;      // 오늘 반복 횟수 설정
  todayGoal: string | null;  // 오늘의 목표 (공개)
}
