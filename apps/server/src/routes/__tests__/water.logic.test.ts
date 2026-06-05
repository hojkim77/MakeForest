import { calcPersonalStage, getKstDateString, checkDailyCapExceeded } from '../water.logic';

// calcPersonalStage now uses minute-based thresholds via growth.constants.ts.
// Minute thresholds: [0, 360, 1080, 2160, 3960, 6480, 10080, 15120, 22320, 32400]
// These are identical to legacy water thresholds × 30 for 30-min users.

describe('calcPersonalStage — minute-based thresholds', () => {
  it('0분 → stage 0', () => expect(calcPersonalStage(0)).toBe(0));
  it('359분 → stage 0 (임계값 미달)', () => expect(calcPersonalStage(359)).toBe(0));
  it('360분 → stage 1 (정확히 임계값; 30min×12회)', () => expect(calcPersonalStage(360)).toBe(1));
  it('1080분 → stage 2', () => expect(calcPersonalStage(1080)).toBe(2));
  it('2160분 → stage 3', () => expect(calcPersonalStage(2160)).toBe(3));
  it('3960분 → stage 4', () => expect(calcPersonalStage(3960)).toBe(4));
  it('6480분 → stage 5', () => expect(calcPersonalStage(6480)).toBe(5));
  it('10080분 → stage 6', () => expect(calcPersonalStage(10080)).toBe(6));
  it('15120분 → stage 7', () => expect(calcPersonalStage(15120)).toBe(7));
  it('22320분 → stage 8', () => expect(calcPersonalStage(22320)).toBe(8));
  it('32400분 → stage 9 (최고 단계)', () => expect(calcPersonalStage(32400)).toBe(9));
  it('99999분 → stage 9 (상한 클램프)', () => expect(calcPersonalStage(99999)).toBe(9));
});

describe('calcPersonalStage — 30min 레거시 유저 동일 단계 보장', () => {
  // legacy thresholds × 30: [0,12,36,72,132,216,336,504,744,1080] → ×30 minutes
  it('12 waters (360분) → stage 1 (동일)', () => expect(calcPersonalStage(12 * 30)).toBe(1));
  it('36 waters (1080분) → stage 2 (동일)', () => expect(calcPersonalStage(36 * 30)).toBe(2));
  it('1080 waters (32400분) → stage 9 (동일)', () => expect(calcPersonalStage(1080 * 30)).toBe(9));
});

describe('getKstDateString — KST 자정 경계', () => {
  it('UTC 14:59:59 = KST 23:59:59 → 같은 날', () => {
    expect(getKstDateString(new Date('2024-01-05T14:59:59Z'))).toBe('2024-01-05');
  });

  it('연도 경계: UTC 2024-12-31T15:00:00Z → 2025-01-01', () => {
    expect(getKstDateString(new Date('2024-12-31T15:00:00Z'))).toBe('2025-01-01');
  });

  it('월 경계: UTC 2024-01-31T15:00:00Z → 2024-02-01', () => {
    expect(getKstDateString(new Date('2024-01-31T15:00:00Z'))).toBe('2024-02-01');
  });
});

describe('checkDailyCapExceeded — 사용자별 총량', () => {
  it('30min×12 = 21600초: 21599초 → 미초과', () => expect(checkDailyCapExceeded(21599, 21600)).toBe(false));
  it('30min×12 = 21600초: 21600초 → 초과', () => expect(checkDailyCapExceeded(21600, 21600)).toBe(true));
  it('50min×10 = 30000초: 29999초 → 미초과', () => expect(checkDailyCapExceeded(29999, 30000)).toBe(false));
  it('50min×10 = 30000초: 30000초 → 초과', () => expect(checkDailyCapExceeded(30000, 30000)).toBe(true));
});
