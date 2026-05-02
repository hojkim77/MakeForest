import { addDays, calcStreak, getKstDateString } from '../stats.logic';

describe('getKstDateString — offsetDays 적용', () => {
  it('offsetDays=0 → 오늘 KST 날짜', () => {
    const now = new Date('2024-01-10T12:00:00Z'); // KST 21:00
    expect(getKstDateString(0, now)).toBe('2024-01-10');
  });

  it('UTC 자정 직전: KST 기준 올바른 날짜 반환', () => {
    const now = new Date('2024-01-05T14:59:59Z'); // KST 23:59:59
    expect(getKstDateString(0, now)).toBe('2024-01-05');
  });
});

describe('addDays', () => {
  it('+1일: 월 경계 처리', () => expect(addDays('2024-01-31', 1)).toBe('2024-02-01'));
  it('-1일: 연도 경계', () => expect(addDays('2024-01-01', -1)).toBe('2023-12-31'));
});

describe('calcStreak', () => {
  it('빈 배열 → { current: 0, max: 0 }', () => {
    expect(calcStreak([], '2024-01-10')).toEqual({ current: 0, max: 0 });
  });

  it('오늘 하루만 → { current: 1, max: 1 } (비정렬 입력도 정상 처리)', () => {
    expect(calcStreak(['2024-01-10'], '2024-01-10')).toEqual({ current: 1, max: 1 });
  });

  it('어제부터 3일 연속 (오늘 미입력이어도 스트릭 유지)', () => {
    expect(calcStreak(['2024-01-09', '2024-01-08', '2024-01-07'], '2024-01-10'))
      .toEqual({ current: 3, max: 3 });
  });

  it('단절: 오늘만 있고 어제 없음', () => {
    expect(calcStreak(['2024-01-10', '2024-01-08'], '2024-01-10'))
      .toEqual({ current: 1, max: 1 });
  });

  it('max > current: 과거 연속이 더 길었던 경우', () => {
    expect(calcStreak(['2024-01-10', '2024-01-03', '2024-01-02', '2024-01-01'], '2024-01-10'))
      .toEqual({ current: 1, max: 3 });
  });
});
