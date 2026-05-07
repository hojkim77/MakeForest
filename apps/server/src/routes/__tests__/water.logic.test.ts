import { calcPersonalStage, getKstDateString, checkDailyCapExceeded } from '../water.logic';

describe('calcPersonalStage', () => {
  // PERSONAL_STAGE_THRESHOLDS = [0, 12, 36, 72, 132, 216, 336, 504, 744, 1080] — 10단계
  it('0회 → stage 0', () => expect(calcPersonalStage(0)).toBe(0));
  it('11회 → stage 0 (임계값 미달)', () => expect(calcPersonalStage(11)).toBe(0));
  it('12회 → stage 1 (정확히 임계값)', () => expect(calcPersonalStage(12)).toBe(1));
  it('36회 → stage 2 (정확히 임계값)', () => expect(calcPersonalStage(36)).toBe(2));
  it('72회 → stage 3 (정확히 임계값)', () => expect(calcPersonalStage(72)).toBe(3));
  it('132회 → stage 4 (정확히 임계값)', () => expect(calcPersonalStage(132)).toBe(4));
  it('216회 → stage 5 (정확히 임계값)', () => expect(calcPersonalStage(216)).toBe(5));
  it('336회 → stage 6 (정확히 임계값)', () => expect(calcPersonalStage(336)).toBe(6));
  it('504회 → stage 7 (정확히 임계값)', () => expect(calcPersonalStage(504)).toBe(7));
  it('744회 → stage 8 (정확히 임계값)', () => expect(calcPersonalStage(744)).toBe(8));
  it('1080회 → stage 9 (최고 단계)', () => expect(calcPersonalStage(1080)).toBe(9));
  it('9999회 → stage 9 (상한 클램프)', () => expect(calcPersonalStage(9999)).toBe(9));
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
