import { z } from 'zod';

export const FullTourStepId = z.enum([
  'panel.myNeighborhood',
  'panel.peek',
  'timer.start',
  'water.action',
  'map.modeToggle',
  'creature.stage',
  'community.entry',
  'mypage.entry',
]);

export const DailyGuideStepId = z.enum([
  'daily.streak',
  'daily.creatureProgress',
  'daily.neighborhoodDelta',
]);

export const GuideStateQuery = z.object({ userId: z.string() });

export const GuideStateRes = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({
    kind: z.literal('fullTour'),
    steps: z.array(FullTourStepId),
  }),
  z.object({
    kind: z.literal('daily'),
    steps: z.array(DailyGuideStepId),
    payload: z.object({
      streak: z.object({
        currentStreak: z.number().int().min(0),
        todayWaterCount: z.number().int().min(0),
        dailyGoal: z.number().int().min(0),
      }),
      creature: z.object({
        stage: z.number().int().min(0).max(9),
        totalWaterCount: z.number().int().min(0),
        watersUntilNextStage: z.number().int().min(0).nullable(),
      }),
      neighborhood: z.object({
        dongCode: z.string(),
        missionCompleted: z.boolean(),
      }),
    }),
  }),
]);

export const GuideTourCompleteBody = z.object({
  userId: z.string(),
  outcome: z.enum(['completed', 'skipped']),
});

export const GuideDailyDismissBody = z.object({
  userId: z.string(),
  outcome: z.enum(['completed', 'skipped']),
});

export const GuideAckRes = z.object({ ok: z.literal(true) });

export type GuideStateResType = z.infer<typeof GuideStateRes>;
export type FullTourStepIdType = z.infer<typeof FullTourStepId>;
export type DailyGuideStepIdType = z.infer<typeof DailyGuideStepId>;
