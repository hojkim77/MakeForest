export { calcPersonalStage, minutesUntilNextStage } from './growth.constants';

export function getKstDateString(now: Date = new Date()): string {
  return now.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '');
}

export function checkDailyCapExceeded(elapsedSec: number, dailyCapSec: number): boolean {
  return elapsedSec >= dailyCapSec;
}
