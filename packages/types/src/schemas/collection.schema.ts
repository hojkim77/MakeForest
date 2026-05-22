import { z } from 'zod';

export const CollectionQuery = z.object({
  regionCode: z.string(),
});

export const CollectionTodayRes = z.object({
  creatureType: z.string(),
  targetCount: z.number(),
  currentCount: z.number(),
  isCompleted: z.boolean(),
});

export const CollectionCompletedRes = z.array(z.object({
  creatureType: z.string(),
  date: z.string(),
}));

export type CollectionQueryType = z.infer<typeof CollectionQuery>;
export type CollectionTodayResType = z.infer<typeof CollectionTodayRes>;
export type CollectionCompletedResType = z.infer<typeof CollectionCompletedRes>;
