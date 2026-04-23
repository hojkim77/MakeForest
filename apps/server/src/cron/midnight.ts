import cron from 'node-cron';
import { prisma } from '@makeforest/db';

export function registerCronJobs(): void {
  // 매일 자정 (KST = UTC+9, 즉 UTC 15:00)
  cron.schedule('0 15 * * *', async () => {
    console.log('[cron] 자정 배치 시작');

    // 24시간 이상 COMPLETED 상태로 미수확된 세션 → ABANDONED
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await prisma.focusSession.updateMany({
      where: {
        status: 'COMPLETED',
        endedAt: { lt: cutoff },
      },
      data: { status: 'ABANDONED' },
    });

    console.log(`[cron] ${result.count}개 세션 AUTO_ABANDONED 처리`);
  });

  console.log('[cron] 자정 배치 등록 완료');
}
