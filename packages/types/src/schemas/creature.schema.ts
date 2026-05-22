import { z } from 'zod';

export const CreatureRegionRes = z.object({
  userCount: z.number(),
  avgStage: z.number(),
  maxStage: z.number(),
  totalWaterCount: z.number(),
  date: z.string(),
});

export type CreatureRegionResType = z.infer<typeof CreatureRegionRes>;
