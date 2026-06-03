import { getKstDateString } from './water.logic';

export function getKstDateOffset(days: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return getKstDateString(d);
}
