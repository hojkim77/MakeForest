import { z } from 'zod';
import { TodoSchema } from '../session';

export const CreateSessionBody = z.object({
  dongCode: z.string(),
  todos: z.array(TodoSchema),
  userId: z.string(),
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
});

export type CreateSessionBodyType = z.infer<typeof CreateSessionBody>;
export type UpdateTodosBodyType = z.infer<typeof UpdateTodosBody>;
export type UpdateSessionBodyType = z.infer<typeof UpdateSessionBody>;
export type GetSessionQueryType = z.infer<typeof GetSessionQuery>;
export type CreateSessionResType = z.infer<typeof CreateSessionRes>;
