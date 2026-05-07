const PERSONAL_STAGE_THRESHOLDS = [0, 1, 3, 6, 10];
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
