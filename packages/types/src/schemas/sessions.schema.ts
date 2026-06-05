import { z } from 'zod';
import { TodoSchema } from '../session';

export const CreateSessionBody = z.object({
  dongCode: z.string(),
  todos: z.array(TodoSchema),
  userId: z.string(),
  todayGoal: z.string(),
  focusLengthMin: z.number().int(),
  segmentCount: z.number().int(),
});

export const UpdateTodosBody = z.object({
  todos: z.array(TodoSchema),
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

export type CreateSessionBodyType = z.infer<typeof CreateSessionBody>;
export type UpdateTodosBodyType = z.infer<typeof UpdateTodosBody>;
export type UpdateSessionBodyType = z.infer<typeof UpdateSessionBody>;
export type GetSessionQueryType = z.infer<typeof GetSessionQuery>;
export type CreateSessionResType = z.infer<typeof CreateSessionRes>;
export type TodayStateResType = z.infer<typeof TodayStateRes>;

export interface TodaySession {
  id: string;
  startedAt: string;
  status: string;
  todos: { id: string; text: string; done: boolean }[];
}
