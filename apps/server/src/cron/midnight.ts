import cron from 'node-cron';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys, removeActiveDong } from '@makeforest/redis';
import { broadcastHeatmap } from '../routes/map';
import { calcPersonalStage, getKstDateString } from '../routes/water.logic';
import { toPixel, GRID_W, GRID_H } from '../routes/map.logic';
import { regionOf } from '@makeforest/types';

const CREATURE_TYPES = [
  'SEED', 'SPROUT', 'GRASS', 'FLOWER_A', 'FLOWER_B',
  'SAPLING', 'MUSHROOM', 'ROCK', 'OAK', 'PINE',
  'BAMBOO', 'BIG_OAK', 'CHERRY', 'RARE_ANIMAL',
] as const;

export function registerCronJobs(): void {
  // 매일 자정 (KST = UTC+9, 즉 UTC 15:00)
  cron.schedule('0 15 * * *', async () => {
    console.log('[cron] 자정 배치 시작');
    try {
      await runMidnightBatch();
      console.log('[cron] 자정 배치 완료');
    } catch (err) {
      console.error('[cron] 자정 배치 오류:', err);
    }
  });

  console.log('[cron] 자정 배치 등록 완료');
}

export async function runMidnightBatch(): Promise<void> {
  const yesterday = getKstDateString(new Date(Date.now() - 1000));

  // ① 물주기 미입력 자동 반영: 2시간 이상 집중 & waterCount=0인 유저
  await autoWaterUnwatered(yesterday);

  // ② RUNNING 세션 전체 ABANDONED 처리
  const runningSessions = await prisma.focusSession.findMany({
    where: { status: 'RUNNING' },
    select: { id: true, dongCode: true },
  });

  if (runningSessions.length > 0) {
    await prisma.focusSession.updateMany({
      where: { status: 'RUNNING' },
      data: { status: 'ABANDONED' },
    });
  }

  // ③ Redis 활성 세션 정리
  await clearRedisActiveSessions(runningSessions.map((s) => ({ id: s.id, dongCode: s.dongCode })));

  // ④ Fossil 생성 (전날 물주기 기록 있는 유저)
  await createUserFossils(yesterday);
}

async function autoWaterUnwatered(date: string): Promise<void> {
  const kstMidnightUtc = new Date(`${date}T00:00:00+09:00`);
  const nextMidnightUtc = new Date(kstMidnightUtc.getTime() + 86400000);

  // 해당 날짜 FocusSession 전체 조회
  const sessions = await prisma.focusSession.findMany({
    where: { date },
    select: { userId: true, dongCode: true, startedAt: true, totalElapsedSec: true, waterCount: true, status: true },
  });

  for (const session of sessions) {
    // waterCount가 이미 있으면 스킵
    if (session.waterCount > 0) continue;

    // totalElapsedSec + 자정까지 RUNNING 중이었다면 남은 시간 추가
    let totalSec = session.totalElapsedSec;
    if (session.status === 'RUNNING') {
      totalSec += Math.floor((nextMidnightUtc.getTime() - session.startedAt.getTime()) / 1000);
    }

    if (totalSec < 7200) continue;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.userCreature.findUnique({ where: { userId: session.userId } });
      const newWaterCount = (existing?.waterCount ?? 0) + 1;
      const newStage = calcPersonalStage(newWaterCount);

      await tx.userCreature.upsert({
        where: { userId: session.userId },
        update: { waterCount: newWaterCount, stage: newStage },
        create: { userId: session.userId, waterCount: newWaterCount, stage: newStage },
      });

      await tx.focusSession.update({
        where: { userId_date: { userId: session.userId, date } },
        data: { waterCount: 1, totalElapsedSec: Math.min(totalSec, 21600) },
      });

      await tx.wateringLog.create({
        data: { userId: session.userId, dongCode: session.dongCode, date },
      });
    });
  }
}

async function clearRedisActiveSessions(
  sessions: { id: string; dongCode: string }[],
): Promise<void> {
  for (const { id, dongCode } of sessions) {
    await removeActiveDong(dongCode, id);
  }

  const heatmapRaw = await redis.hgetall(RedisKeys.heatmapDong()) ?? {};
  const activeDongCodes = Object.keys(heatmapRaw).filter((k) => Number(heatmapRaw[k]) > 0);

  for (const code of activeDongCodes) {
    await redis.del(RedisKeys.dongActive(code));
  }

  const dongs = await prisma.dong.findMany({
    where: { code: { in: activeDongCodes } },
    select: { code: true, name: true },
  });

  const regionCodes = new Set<string>();
  for (const d of dongs) regionCodes.add(regionOf(d.code, d.name));
  for (const rc of regionCodes) {
    await redis.del(RedisKeys.regionActive(rc));
  }

  await redis.del(RedisKeys.heatmapDong());
  broadcastHeatmap({});
}

async function createUserFossils(date: string): Promise<void> {
  const wateredToday = await prisma.wateringLog.findMany({
    where: { date },
    select: { userId: true, dongCode: true },
    distinct: ['userId'],
  });

  if (wateredToday.length === 0) return;

  const userIds = wateredToday.map((w) => w.userId);

  const creatures = await prisma.userCreature.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, stage: true },
  });
  const creatureMap = new Map(creatures.map((c) => [c.userId, c.stage]));

  const dongCodes = [...new Set(wateredToday.map((w) => w.dongCode))];
  const dongRecords = await prisma.dong.findMany({
    where: { code: { in: dongCodes } },
    select: { code: true, lat: true, lng: true },
  });
  const dongCoordMap = new Map(dongRecords.map((d) => [d.code, { lat: d.lat, lng: d.lng }]));

  const [y, m, day] = date.split('-').map(Number);
  const dayOfYear = Math.floor(
    (new Date(y!, m! - 1, day!).getTime() - new Date(y!, 0, 0).getTime()) / 86400000,
  );

  for (const { userId, dongCode } of wateredToday) {
    const stage = creatureMap.get(userId) ?? 0;
    const coord = dongCoordMap.get(dongCode);
    if (!coord) continue;

    const { pixelX, pixelY } = toPixel(coord.lat, coord.lng);
    const jx = Math.floor(Math.random() * 7) - 3;
    const jy = Math.floor(Math.random() * 7) - 3;
    const fossilX = Math.max(0, Math.min(GRID_W - 1, pixelX + jx));
    const fossilY = Math.max(0, Math.min(GRID_H - 1, pixelY + jy));

    const userHash = userId.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    const creatureType = CREATURE_TYPES[(dayOfYear + userHash) % CREATURE_TYPES.length]!;

    await prisma.fossil.upsert({
      where: { userId_date: { userId, date } },
      update: { stage },
      create: { userId, dongCode, date, creatureType, stage, fossilX, fossilY },
    });
  }
}
