import { calcPersonalStage, getKstDateString, checkDailyCapExceeded } from '../water.logic';

describe('calcPersonalStage', () => {
  // PERSONAL_STAGE_THRESHOLDS = [0, 1, 3, 6, 10] — 경계값과 상한 클램프만 검증
  it('0회 → stage 0', () => expect(calcPersonalStage(0)).toBe(0));
  it('1회 → stage 1 (정확히 임계값)', () => expect(calcPersonalStage(1)).toBe(1));
  it('3회 → stage 2 (정확히 임계값)', () => expect(calcPersonalStage(3)).toBe(2));
  it('6회 → stage 3 (정확히 임계값)', () => expect(calcPersonalStage(6)).toBe(3));
  it('10회 → stage 4 (정확히 임계값)', () => expect(calcPersonalStage(10)).toBe(4));
  it('100회 → stage 4 (상한 클램프)', () => expect(calcPersonalStage(100)).toBe(4));
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

describe('checkDailyCapExceeded — 하루 6시간(21600초) 총량', () => {
  it('21599초 → 미초과 (1초 부족)', () => expect(checkDailyCapExceeded(21599)).toBe(false));
  it('21600초 → 초과 (정확히 6시간)', () => expect(checkDailyCapExceeded(21600)).toBe(true));
});
