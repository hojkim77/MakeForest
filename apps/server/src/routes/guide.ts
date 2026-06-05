import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import {
  GuideStateQuery,
  GuideTourCompleteBody,
  GuideDailyDismissBody,
} from '@makeforest/types';
import { getKstDateString } from './water.logic';
import { getKstDateString as getKstDateStringWithOffset, calcStreak } from './stats.logic';
import { calcPersonalStage, minutesUntilNextStage } from './growth.constants';

const DAILY_GOAL = 12;

const FULL_TOUR_STEPS = [
  'panel.myNeighborhood',
  'panel.peek',
  'timer.start',
  'water.action',
  'map.modeToggle',
  'creature.stage',
  'community.entry',
  'mypage.entry',
] as const;

const DAILY_STEPS = [
  'daily.streak',
  'daily.creatureProgress',
  'daily.neighborhoodDelta',
] as const;

export const guideRouter = Router();

// GET /guide/state?userId=
guideRouter.get('/state', async (req: Request, res: Response) => {
  try {
    const { userId } = GuideStateQuery.parse(req.query);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dongCode: true, regionCode: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.dongCode) {
      return res.json({ kind: 'none' });
    }

    const guideState = await prisma.userGuideState.findUnique({
      where: { userId },
    });

    if (!guideState || guideState.tourCompletedAt === null) {
      return res.json({ kind: 'fullTour', steps: FULL_TOUR_STEPS });
    }

    const todayKst = getKstDateString();
    if (guideState.lastDailyGuideShownDate === todayKst) {
      return res.json({ kind: 'none' });
    }

    // Build daily payload
    const yesterdayKst = getKstDateStringWithOffset(-1);
    const dongCode = user.dongCode;

    const [sessions, creature, todaySession, yesterdayCollection] = await Promise.all([
      prisma.focusSession.findMany({
        where: { userId },
        select: { date: true, waterCount: true },
      }),
      prisma.userCreature.findUnique({
        where: { userId },
        select: { stage: true, totalWaterCount: true, totalFocusMinutes: true },
      }),
      prisma.focusSession.findUnique({
        where: { userId_date: { userId, date: todayKst } },
        select: { waterCount: true },
      }),
      user.regionCode
        ? prisma.dailyCollection.findUnique({
            where: { regionCode_date: { regionCode: user.regionCode, date: yesterdayKst } },
            select: { isCompleted: true },
          })
        : Promise.resolve(null),
    ]);

    const waterDates = sessions.filter((s) => s.waterCount > 0).map((s) => s.date);
    const { current: currentStreak } = calcStreak(waterDates, todayKst);

    const todayWaterCount = todaySession?.waterCount ?? 0;

    const stage = creature?.stage ?? 0;
    const totalWaterCount = creature?.totalWaterCount ?? 0;
    // Fallback for legacy rows where totalFocusMinutes may be 0 but totalWaterCount is set
    const effectiveFocusMinutes =
      (creature?.totalFocusMinutes ?? 0) > 0
        ? (creature!.totalFocusMinutes)
        : totalWaterCount * 30;

    // stage from minutesUntilNextStage uses effectiveFocusMinutes
    const computedStage = calcPersonalStage(effectiveFocusMinutes);
    const stageToUse = computedStage || stage;

    return res.json({
      kind: 'daily',
      steps: DAILY_STEPS,
      payload: {
        streak: {
          currentStreak,
          todayWaterCount,
          dailyGoal: DAILY_GOAL,
        },
        creature: {
          stage: stageToUse,
          totalWaterCount,
          totalFocusMinutes: effectiveFocusMinutes,
          minutesUntilNextStage: minutesUntilNextStage(effectiveFocusMinutes),
        },
        neighborhood: {
          dongCode,
          missionCompleted: yesterdayCollection?.isCompleted ?? false,
        },
      },
    });
  } catch (err) {
    console.error('[guide] GET /state error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /guide/tour/complete
guideRouter.post('/tour/complete', async (req: Request, res: Response) => {
  try {
    const { userId } = GuideTourCompleteBody.parse(req.body);

    const existing = await prisma.userGuideState.findUnique({
      where: { userId },
      select: { tourCompletedAt: true },
    });

    if (existing?.tourCompletedAt) {
      return res.json({ ok: true });
    }

    await prisma.userGuideState.upsert({
      where: { userId },
      create: { userId, tourCompletedAt: new Date() },
      update: { tourCompletedAt: new Date() },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[guide] POST /tour/complete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /guide/daily/dismiss
guideRouter.post('/daily/dismiss', async (req: Request, res: Response) => {
  try {
    const { userId } = GuideDailyDismissBody.parse(req.body);

    const existing = await prisma.userGuideState.findUnique({
      where: { userId },
      select: { tourCompletedAt: true, lastDailyGuideShownDate: true },
    });

    if (!existing?.tourCompletedAt) {
      return res.status(409).json({ error: 'Full tour not completed' });
    }

    const todayKst = getKstDateString();
    if (existing.lastDailyGuideShownDate === todayKst) {
      return res.json({ ok: true });
    }

    await prisma.userGuideState.update({
      where: { userId },
      data: { lastDailyGuideShownDate: todayKst },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[guide] POST /daily/dismiss error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
