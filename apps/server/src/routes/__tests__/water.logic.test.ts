import { calcStage, getKstDateString, checkDailyCapExceeded } from '../water.logic';

describe('calcStage', () => {
  // STAGE_THRESHOLDS = [0, 5, 12, 25, 45]

  it('0회 → stage 0', () => expect(calcStage(0)).toBe(0));
  it('4회 → stage 0 (임계값 5 미만)', () => expect(calcStage(4)).toBe(0));
  it('5회 → stage 1 (정확히 임계값)', () => expect(calcStage(5)).toBe(1));
  it('11회 → stage 1', () => expect(calcStage(11)).toBe(1));
  it('12회 → stage 2 (정확히 임계값)', () => expect(calcStage(12)).toBe(2));
  it('24회 → stage 2', () => expect(calcStage(24)).toBe(2));
  it('25회 → stage 3 (정확히 임계값)', () => expect(calcStage(25)).toBe(3));
  it('44회 → stage 3', () => expect(calcStage(44)).toBe(3));
  it('45회 → stage 4 (정확히 임계값)', () => expect(calcStage(45)).toBe(4));
  it('100회 → stage 4 (상한 클램프)', () => expect(calcStage(100)).toBe(4));
});

describe('getKstDateString — KST 자정 경계', () => {
  it('UTC 14:59:59 = KST 23:59:59 → 같은 날', () => {
    expect(getKstDateString(new Date('2024-01-05T14:59:59Z'))).toBe('2024-01-05');
  });

  it('UTC 15:00:00 = KST 00:00:00 → 다음 날로 전환', () => {
    expect(getKstDateString(new Date('2024-01-05T15:00:00Z'))).toBe('2024-01-06');
  });

  it('연도 경계: UTC 2024-12-31T15:00:00Z → 2025-01-01', () => {
    expect(getKstDateString(new Date('2024-12-31T15:00:00Z'))).toBe('2025-01-01');
  });

  it('월 경계: UTC 2024-01-31T15:00:00Z → 2024-02-01', () => {
    expect(getKstDateString(new Date('2024-01-31T15:00:00Z'))).toBe('2024-02-01');
  });
});

describe('checkDailyCapExceeded — 하루 6시간(21600초) 총량', () => {
  it('0초 → 미초과', () => expect(checkDailyCapExceeded(0)).toBe(false));
  it('21599초 → 미초과 (1초 부족)', () => expect(checkDailyCapExceeded(21599)).toBe(false));
  it('21600초 → 초과 (정확히 6시간)', () => expect(checkDailyCapExceeded(21600)).toBe(true));
  it('99999초 → 초과', () => expect(checkDailyCapExceeded(99999)).toBe(true));
});
