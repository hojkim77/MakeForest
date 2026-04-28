export function getKstDateString(offsetDays = 0, now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '');
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '');
}

export function calcStreak(
  datesWithWater: string[],
  today: string,
): { current: number; max: number } {
  if (datesWithWater.length === 0) return { current: 0, max: 0 };

  const sorted = [...datesWithWater].sort().reverse();
  const yesterday = addDays(today, -1);

  let current = 0;
  const startDate = sorted[0] === today || sorted[0] === yesterday ? sorted[0] : null;
  if (startDate) {
    let expected = startDate;
    for (const date of sorted) {
      if (date === expected) {
        current++;
        expected = addDays(expected, -1);
      } else {
        break;
      }
    }
  }

  const ascSorted = [...datesWithWater].sort();
  let max = 0;
  let run = 1;
  for (let i = 1; i < ascSorted.length; i++) {
    if (ascSorted[i] === addDays(ascSorted[i - 1]!, 1)) {
      run++;
    } else {
      max = Math.max(max, run);
      run = 1;
    }
  }
  max = Math.max(max, run);

  return { current, max };
}
