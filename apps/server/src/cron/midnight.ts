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
  // 자정 직전 1초 기준으로 "어제" KST 날짜 계산
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
      data: { status: 'ABANDONED', endedAt: new Date() },
    });
  }

  // ③ Redis 활성 세션 정리
  await clearRedisActiveSessions(runningSessions.map((s) => ({ id: s.id, dongCode: s.dongCode })));

  // ④ Fossil 생성 (전날 stage >= 1 개인 생명체 박제)
  await createUserFossils(yesterday);
}

async function autoWaterUnwatered(date: string): Promise<void> {
  // 해당 날짜 내 종료된 세션(자정 기준 포함) 집계
  const kstMidnightUtc = new Date(`${date}T15:00:00Z`); // 전날 KST 00:00 = UTC 전날 15:00
  const sessions = await prisma.focusSession.findMany({
    where: {
      startedAt: { gte: kstMidnightUtc },
      endedAt: { not: null },
    },
    select: { userId: true, dongCode: true, startedAt: true, endedAt: true },
  });

  // userId별 총 집중 시간 합산
  const userMap = new Map<string, { totalSec: number; dongCode: string }>();
  for (const s of sessions) {
    const sec = Math.floor((s.endedAt!.getTime() - s.startedAt.getTime()) / 1000);
    const prev = userMap.get(s.userId) ?? { totalSec: 0, dongCode: s.dongCode };
    userMap.set(s.userId, { totalSec: prev.totalSec + sec, dongCode: s.dongCode });
  }

  for (const [userId, { totalSec, dongCode }] of userMap.entries()) {
    if (totalSec < 7200) continue;

    const daily = await prisma.dailySession.findUnique({
      where: { userId_date: { userId, date } },
    });
    if ((daily?.waterCount ?? 0) > 0) continue;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.userCreature.findUnique({
        where: { userId_date: { userId, date } },
      });
      const newWaterCount = (existing?.waterCount ?? 0) + 1;
      const newStage = calcPersonalStage(newWaterCount);

      await tx.userCreature.upsert({
        where: { userId_date: { userId, date } },
        update: { waterCount: newWaterCount, stage: newStage },
        create: { userId, date, waterCount: newWaterCount, stage: newStage },
      });

      await tx.dailySession.upsert({
        where: { userId_date: { userId, date } },
        update: { waterCount: 1, elapsedSec: totalSec },
        create: { userId, date, elapsedSec: totalSec, waterCount: 1 },
      });

      await tx.wateringLog.create({ data: { userId, dongCode, date } });
    });
  }
}

async function clearRedisActiveSessions(
  sessions: { id: string; dongCode: string }[],
): Promise<void> {
  for (const { id, dongCode } of sessions) {
    await removeActiveDong(dongCode, id);
  }

  // 히트맵 해시에서 활성 동 목록 추출 → regionActive 키 삭제
  const heatmapRaw = await redis.hgetall(RedisKeys.heatmapDong()) ?? {};
  const activeDongCodes = Object.keys(heatmapRaw).filter((k) => Number(heatmapRaw[k]) > 0);

  for (const code of activeDongCodes) {
    await redis.del(RedisKeys.dongActive(code));
  }

  // regionActive 키는 dong 목록을 통해 역산
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
  const finishedCreatures = await prisma.userCreature.findMany({
    where: { date, stage: { gte: 1 } },
    select: { userId: true, stage: true },
  });

  if (finishedCreatures.length === 0) return;

  // 각 userId의 dongCode 조회 (User.dongCode 사용)
  const userIds = finishedCreatures.map((c) => c.userId);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, dongCode: true },
  });
  const userDongMap = new Map(users.map((u) => [u.id, u.dongCode]));

  // day-of-year 기반 creatureType 결정
  const [y, m, day] = date.split('-').map(Number);
  const dayOfYear = Math.floor(
    (new Date(y!, m! - 1, day!).getTime() - new Date(y!, 0, 0).getTime()) / 86400000,
  );

  // dongCode → Dong lat/lng 캐시
  const allDongCodes = new Set<string>();
  for (const { userId } of finishedCreatures) {
    const dc = userDongMap.get(userId);
    if (dc) allDongCodes.add(dc);
  }

  const dongRecords = await prisma.dong.findMany({
    where: { code: { in: [...allDongCodes] } },
    select: { code: true, lat: true, lng: true },
  });
  const dongCoordMap = new Map(dongRecords.map((d) => [d.code, { lat: d.lat, lng: d.lng }]));

  for (const { userId, stage } of finishedCreatures) {
    const dongCode = userDongMap.get(userId);
    if (!dongCode) continue;

    const coord = dongCoordMap.get(dongCode);
    if (!coord) continue;

    const { pixelX, pixelY } = toPixel(coord.lat, coord.lng);
    const jx = Math.floor(Math.random() * 7) - 3;
    const jy = Math.floor(Math.random() * 7) - 3;
    const fossilX = Math.max(0, Math.min(GRID_W - 1, pixelX + jx));
    const fossilY = Math.max(0, Math.min(GRID_H - 1, pixelY + jy));

    // userId 해시 기반 creatureType (같은 유저는 항상 같은 타입)
    const userHash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const creatureType = CREATURE_TYPES[(dayOfYear + userHash) % CREATURE_TYPES.length]!;

    await prisma.fossil.upsert({
      where: { userId_date: { userId, date } },
      update: {},
      create: { userId, dongCode, date, creatureType, stage, fossilX, fossilY },
    });
  }
}
