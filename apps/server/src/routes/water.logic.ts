// 누적 물주기 횟수 → 단계 임계값 (0~9)
// 단계별 요구량: 12 / 24 / 36 / 60 / 84 / 120 / 168 / 240 / 336 → 최고 단계 90일 목표
const PERSONAL_STAGE_THRESHOLDS = [0, 12, 36, 72, 132, 216, 336, 504, 744, 1080];
const DAILY_CAP_SEC = 6 * 60 * 60; // 21600

export function calcPersonalStage(waterCount: number): number {
  for (let i = PERSONAL_STAGE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (waterCount >= PERSONAL_STAGE_THRESHOLDS[i]!) return i;
  }
  return 0;
}

export function getKstDateString(now: Date = new Date()): string {
  return now.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '');
}

export function checkDailyCapExceeded(elapsedSec: number): boolean {
  return elapsedSec >= DAILY_CAP_SEC;
}
