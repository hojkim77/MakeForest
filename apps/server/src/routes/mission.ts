import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { getKstDateString, calcPersonalStage } from './water.logic';
import { addDays } from './stats.logic';
import { calcMissionTarget, pickDailyCreature } from './mission.logic';
import { MissionQuery, type MissionProgress } from '@makeforest/types';
import { getSession, setSession } from '@makeforest/redis';

export const missionRouter = Router();

// DailyMission을 가져오거나 없으면 lazy 생성
export async function getOrCreateMission(regionCode: string, date: string) {
  const existing = await prisma.dailyMission.findUnique({
    where: { regionCode_date: { regionCode, date } },
  });
  if (existing) return existing;

  const sevenDaysAgo = addDays(date, -7);
  const activeRows = await prisma.wateringLog.findMany({
    where: { date: { gte: sevenDaysAgo, lt: date }, user: { regionCode } },
    distinct: ['userId'],
    select: { userId: true },
  });
  const target = calcMissionTarget(activeRows.length);
  const creatureType = pickDailyCreature(regionCode, date);

  return prisma.dailyMission.upsert({
    where: { regionCode_date: { regionCode, date } },
    update: {},
    create: { regionCode, date, creatureType, targetCount: target, currentCount: 0 },
  });
}

// 세션 시작 시 currentCount 증가, 달성 체크 후 MissionProgress 반환
export async function incrementMission(
  regionCode: string,
  date: string,
): Promise<MissionProgress & { justCompleted: boolean }> {
  const mission = await getOrCreateMission(regionCode, date);

  if (mission.isCompleted) {
    return {
      creatureType: mission.creatureType,
      currentCount: mission.currentCount,
      targetCount: mission.targetCount,
      isCompleted: true,
      justCompleted: false,
    };
  }

  const newCount = mission.currentCount + 1;
  const isCompleted = newCount >= mission.targetCount;

  const updated = await prisma.dailyMission.update({
    where: { regionCode_date: { regionCode, date } },
    data: {
      currentCount: newCount,
      isCompleted,
      ...(isCompleted ? { completedAt: new Date() } : {}),
    },
  });

  return {
    creatureType: updated.creatureType,
    currentCount: updated.currentCount,
    targetCount: updated.targetCount,
    isCompleted: updated.isCompleted,
    justCompleted: isCompleted,
  };
}

// 공통미션 달성 시 RUNNING/IDLE 세션 유저들에게 60분 보너스 지급
export async function applyMissionBonus(regionCode: string, date: string): Promise<string[]> {
  const sessions = await prisma.focusSession.findMany({
    where: { date, status: { in: ['RUNNING', 'IDLE'] }, user: { regionCode } },
    select: { id: true, userId: true },
  });

  if (sessions.length === 0) return [];

  const userIds = sessions.map((s) => s.userId);
  const creatures = await prisma.userCreature.findMany({
    where: { userId: { in: userIds } },
  });

  await prisma.$transaction(
    creatures.map((c) => {
      const newMin = c.totalFocusMinutes + 60;
      const newStage = calcPersonalStage(newMin);
      const newWaterCount = Math.floor(newMin / 30);
      return prisma.userCreature.update({
        where: { userId: c.userId },
        data: { totalFocusMinutes: newMin, stage: newStage, totalWaterCount: newWaterCount },
      });
    }),
  );

  // Redis 캐시 갱신
  const creatureMap = new Map(creatures.map((c) => [c.userId, c]));
  for (const s of sessions) {
    const cached = await getSession(s.id);
    if (cached) {
      const prev = creatureMap.get(s.userId);
      const newMin = (prev?.totalFocusMinutes ?? cached.totalFocusMinutes) + 60;
      await setSession(s.id, {
        ...cached,
        totalFocusMinutes: newMin,
        totalWaterCount: Math.floor(newMin / 30),
        creatureStage: calcPersonalStage(newMin),
      });
    }
  }

  return userIds;
}

// GET /mission/today?regionCode=
missionRouter.get('/today', async (req: Request, res: Response) => {
  try {
    const { regionCode } = MissionQuery.parse(req.query);

    const today = getKstDateString();
    const mission = await getOrCreateMission(regionCode, today);

    return res.json({
      creatureType: mission.creatureType,
      targetCount: mission.targetCount,
      currentCount: mission.currentCount,
      isCompleted: mission.isCompleted,
    });
  } catch (err) {
    console.error('[mission] GET /today error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /mission/completed?regionCode=
missionRouter.get('/completed', async (req: Request, res: Response) => {
  try {
    const { regionCode } = MissionQuery.parse(req.query);

    const completed = await prisma.dailyMission.findMany({
      where: { regionCode, isCompleted: true },
      select: { creatureType: true, date: true },
      orderBy: { date: 'asc' },
    });

    return res.json(completed);
  } catch (err) {
    console.error('[mission] GET /completed error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
