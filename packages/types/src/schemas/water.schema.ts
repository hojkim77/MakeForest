import { z } from 'zod';

export const WaterBody = z.object({
  userId: z.string(),
  dongCode: z.string(),
  nickname: z.string(),
});

export const WaterMeQuery = z.object({
  userId: z.string(),
  date: z.string().optional(),
});

export const WaterRes = z.object({
  myWaterCount: z.number(),
  userCreature: z.object({
    stage: z.number(),
    totalWaterCount: z.number(),
  }),
});

export const WaterMeRes = z.object({
  waterCount: z.number(),
  date: z.string(),
  creatureStage: z.number(),
  creatureWaterCount: z.number(),
});

export type WaterBodyType = z.infer<typeof WaterBody>;
export type WaterMeQueryType = z.infer<typeof WaterMeQuery>;
export type WaterResType = z.infer<typeof WaterRes>;
export type WaterMeResType = z.infer<typeof WaterMeRes>;
