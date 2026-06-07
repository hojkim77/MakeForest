import { z } from 'zod';
import { TodoSchema } from '../session';

export const CreateSessionBody = z.object({
  dongCode: z.string(),
  userId: z.string(),
  todayGoal: z.string(),
  focusLengthMin: z.number().int(),
  segmentCount: z.number().int(),
});

export const UpdateSessionBody = z.object({
  action: z.enum(['abandon', 'complete']),
});

export const GetSessionQuery = z.object({
  userId: z.string(),
});

export const CreateSessionRes = z.object({
  sessionId: z.string(),
  startedAt: z.string(),
  isNewSession: z.boolean(),
  focusLengthMin: z.number(),
  segmentCount: z.number(),
  todayGoal: z.string(),
});

export const TodayStateRes = z.object({
  todayGoal: z.string().nullable(),
  focusLengthMin: z.number(),
  segmentCount: z.number(),
  totalDailyCapMin: z.number(),
  sessionStatus: z.enum(['NONE', 'RUNNING', 'IDLE', 'PAUSED', 'COMPLETED', 'ABANDONED']),
  sessionId: z.string().nullable(),
  startedAt: z.string().nullable(),
  waterCount: z.number(),
});

// Todo 관련 스키마
export const CreateTodoBody = z.object({
  userId: z.string(),
  date: z.string(),
  text: z.string().min(1).max(200),
});

export const UpdateTodoBody = z.object({
  text: z.string().min(1).max(200).optional(),
  done: z.boolean().optional(),
});

export const TodoQuery = z.object({
  userId: z.string(),
  date: z.string(),
});

export type CreateSessionBodyType = z.infer<typeof CreateSessionBody>;
export type UpdateSessionBodyType = z.infer<typeof UpdateSessionBody>;
export type GetSessionQueryType = z.infer<typeof GetSessionQuery>;
export type CreateSessionResType = z.infer<typeof CreateSessionRes>;
export type TodayStateResType = z.infer<typeof TodayStateRes>;
export type CreateTodoBodyType = z.infer<typeof CreateTodoBody>;
export type UpdateTodoBodyType = z.infer<typeof UpdateTodoBody>;
export type TodoQueryType = z.infer<typeof TodoQuery>;

export { TodoSchema };

export interface TodaySession {
  id: string;
  startedAt: string;
  status: string;
}
