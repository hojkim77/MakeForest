import { z } from 'zod';

export const RankingPeriodQuery = z.object({
  period: z.enum(['today', 'week', 'all']),
});

export const RegionRankingQuery = z.object({
  period: z.enum(['today', 'week', 'all']),
  myDongCode: z.string().optional(),
});

export type RankingPeriodQueryType = z.infer<typeof RankingPeriodQuery>;
export type RegionRankingQueryType = z.infer<typeof RegionRankingQuery>;
