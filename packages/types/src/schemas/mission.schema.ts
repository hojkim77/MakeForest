import { z } from 'zod';

export const MissionQuery = z.object({
  regionCode: z.string(),
});

export const MissionTodayRes = z.object({
  creatureType: z.string(),
  targetCount: z.number(),
  currentCount: z.number(),
  isCompleted: z.boolean(),
});

export const MissionCompletedRes = z.array(z.object({
  creatureType: z.string(),
  date: z.string(),
}));

export type MissionQueryType = z.infer<typeof MissionQuery>;
export type MissionTodayResType = z.infer<typeof MissionTodayRes>;
export type MissionCompletedResType = z.infer<typeof MissionCompletedRes>;
