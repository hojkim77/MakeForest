import cron from 'node-cron';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys, removeActiveDong } from '@makeforest/redis';
import { broadcastHeatmap } from '../routes/sse';
import { calcPersonalStage, getKstDateString } from '../routes/water.logic';

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
      const newWaterCount = (existing?.totalWaterCount ?? 0) + 1;
      const newStage = calcPersonalStage(newWaterCount);

      await tx.userCreature.upsert({
        where: { userId: session.userId },
        update: { totalWaterCount: newWaterCount, stage: newStage },
        create: { userId: session.userId, totalWaterCount: newWaterCount, stage: newStage },
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

  await redis.del(RedisKeys.heatmapDong());
  broadcastHeatmap({});
}

