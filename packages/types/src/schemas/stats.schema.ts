import { z } from 'zod';

export const StatsQuery = z.object({
  userId: z.string(),
});

export const StatsRankQuery = z.object({
  userId: z.string(),
  dongCode: z.string().optional(),
});

export const FocusStatsRes = z.object({
  totalFocusSec: z.number(),
  currentStreak: z.number(),
  maxStreak: z.number(),
});

export const WeeklyStatsRes = z.object({
  weeklyData: z.array(z.object({ week: z.number(), waterCount: z.number() })),
  weeklyAvg: z.number(),
});

export const RankStatsRes = z.object({
  neighborhoodRank: z.number(),
  neighborhoodTotal: z.number(),
});

export type StatsQueryType = z.infer<typeof StatsQuery>;
export type StatsRankQueryType = z.infer<typeof StatsRankQuery>;
export type FocusStatsResType = z.infer<typeof FocusStatsRes>;
export type WeeklyStatsResType = z.infer<typeof WeeklyStatsRes>;
export type RankStatsResType = z.infer<typeof RankStatsRes>;
