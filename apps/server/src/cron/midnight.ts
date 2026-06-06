import cron from 'node-cron';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys, removeActiveDong } from '@makeforest/redis';
import { broadcastHeatmap } from '../routes/sse';
import { getKstDateString } from '../routes/water.logic';
import { calcPersonalStage } from '../routes/growth.constants';

export function registerCronJobs(): void {
  cron.schedule('0 0 * * *', async () => {
    console.log('[cron] 자정 배치 시작');
    try {
      await runMidnightBatch();
      console.log('[cron] 자정 배치 완료');
    } catch (err) {
      console.error('[cron] 자정 배치 오류:', err);
    }
  }, { timezone: 'Asia/Seoul' });

  console.log('[cron] 자정 배치 등록 완료');
}

export async function runMidnightBatch(): Promise<void> {
  const yesterday = getKstDateString(new Date(Date.now() - 1000));

  // ① 물주기 미입력 자동 반영: 2 × focusLengthMin 분 이상 집중 & waterCount=0인 유저
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
}

async function autoWaterUnwatered(date: string): Promise<void> {
  const kstMidnightUtc = new Date(`${date}T00:00:00+09:00`);
  const nextMidnightUtc = new Date(kstMidnightUtc.getTime() + 86400000);

  const sessions = await prisma.focusSession.findMany({
    where: { date },
    select: {
      userId: true,
      dongCode: true,
      startedAt: true,
      totalElapsedSec: true,
      waterCount: true,
      status: true,
      focusLengthMin: true,
      segmentCount: true,
    },
  });

  for (const session of sessions) {
    if (session.waterCount > 0) continue;

    // Legacy rows (focusLengthMin NULL) fall back to 30 — preserves old behavior exactly.
    const fLen = session.focusLengthMin ?? 30;
    const segs = session.segmentCount ?? 12;
    const autoWaterThreshold = 2 * fLen * 60;
    const perUserCapSec = fLen * segs * 60;

    let totalSec = session.totalElapsedSec;
    if (session.status === 'RUNNING') {
      totalSec += Math.floor((nextMidnightUtc.getTime() - session.startedAt.getTime()) / 1000);
    }

    if (totalSec < autoWaterThreshold) continue;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.userCreature.findUnique({ where: { userId: session.userId } });
      const prevFocusMinutes = (existing?.totalFocusMinutes ?? 0) > 0
        ? (existing!.totalFocusMinutes)
        : (existing?.totalWaterCount ?? 0) * 30;
      const newTotalFocusMinutes = prevFocusMinutes + fLen;
      const newTotalWaterCount = Math.floor(newTotalFocusMinutes / 30);
      const newStage = calcPersonalStage(newTotalFocusMinutes);

      await tx.userCreature.upsert({
        where: { userId: session.userId },
        update: {
          totalFocusMinutes: newTotalFocusMinutes,
          totalWaterCount: newTotalWaterCount,
          stage: newStage,
        },
        create: {
          userId: session.userId,
          totalFocusMinutes: newTotalFocusMinutes,
          totalWaterCount: newTotalWaterCount,
          stage: newStage,
        },
      });

      await tx.focusSession.update({
        where: { userId_date: { userId: session.userId, date } },
        data: {
          waterCount: 1,
          totalElapsedSec: Math.min(totalSec, perUserCapSec),
        },
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

  await redis.del(RedisKeys.heatmapDong());
  broadcastHeatmap({});
}
