import cron from 'node-cron';

export function registerCronJobs(): void {
  // 매일 자정 (KST = UTC+9, 즉 UTC 15:00)
  cron.schedule('0 15 * * *', async () => {
    console.log('[cron] 자정 배치 시작');
    // TODO: Creature 박제 → Fossil 생성, 새 Creature 씨앗 생성
    console.log('[cron] 자정 배치 완료');
  });

  console.log('[cron] 자정 배치 등록 완료');
}
