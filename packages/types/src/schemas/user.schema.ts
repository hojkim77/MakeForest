import { z } from 'zod';

export const UserMeQuery = z.object({
  userId: z.string(),
});

export const UserMeRes = z.object({
  nickname: z.string(),
  avatarUrl: z.string().nullable().optional(),
  dongCode: z.string().nullable().optional(),
  dongName: z.string().nullable().optional(),
  createdAt: z.string(),
  userCreature: z.object({
    stage: z.number(),
    totalWaterCount: z.number(),
  }).nullable().optional(),
});

export type UserMeQueryType = z.infer<typeof UserMeQuery>;
export type UserMeResType = z.infer<typeof UserMeRes>;
