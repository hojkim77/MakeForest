import { calcPersonalStage, minutesUntilNextStage } from '../growth.constants';

describe('calcPersonalStage — 분 기반 임계값', () => {
  it('0분 → stage 0', () => expect(calcPersonalStage(0)).toBe(0));
  it('359분 → stage 0', () => expect(calcPersonalStage(359)).toBe(0));
  it('360분 → stage 1 (12 waters × 30)', () => expect(calcPersonalStage(360)).toBe(1));
  it('1080분 → stage 2', () => expect(calcPersonalStage(1080)).toBe(2));
  it('2160분 → stage 3', () => expect(calcPersonalStage(2160)).toBe(3));
  it('3960분 → stage 4', () => expect(calcPersonalStage(3960)).toBe(4));
  it('6480분 → stage 5', () => expect(calcPersonalStage(6480)).toBe(5));
  it('10080분 → stage 6', () => expect(calcPersonalStage(10080)).toBe(6));
  it('15120분 → stage 7', () => expect(calcPersonalStage(15120)).toBe(7));
  it('22320분 → stage 8', () => expect(calcPersonalStage(22320)).toBe(8));
  it('32400분 → stage 9', () => expect(calcPersonalStage(32400)).toBe(9));
  it('999999분 → stage 9 (최고 단계 클램프)', () => expect(calcPersonalStage(999999)).toBe(9));
});

describe('calcPersonalStage — 자정 스케일 임계 (arch spec §Phase4)', () => {
  // 30×12 = 360분/day: threshold 2×30=60s in auto-water logic
  it('30×12 config: 총 집중 360분 → stage 1', () => expect(calcPersonalStage(360)).toBe(1));
  // 50×10 = 500분/day
  it('50×10 config: 총 집중 500분 → stage 1 (360 기준)', () => expect(calcPersonalStage(500)).toBe(1));
  // 90×4 = 360분/day
  it('90×4 config: 총 집중 360분 → stage 1', () => expect(calcPersonalStage(360)).toBe(1));
  // 5×288 = 1440분/day (boundary)
  it('5×288 config: 총 집중 1440분 → stage 2 (>= 1080)', () => expect(calcPersonalStage(1440)).toBe(2));
  // 120×12 = 1440분/day
  it('120×12 config: 총 집중 1440분 → stage 2', () => expect(calcPersonalStage(1440)).toBe(2));
});

describe('minutesUntilNextStage', () => {
  it('stage 0 (0분): stage 1까지 360분', () => expect(minutesUntilNextStage(0)).toBe(360));
  it('stage 0 일부 (200분): stage 1까지 160분', () => expect(minutesUntilNextStage(200)).toBe(160));
  it('stage 1 (360분): stage 2까지 720분', () => expect(minutesUntilNextStage(360)).toBe(720));
  it('stage 9 (최고): null 반환', () => expect(minutesUntilNextStage(32400)).toBeNull());
  it('stage 9 초과: null 반환', () => expect(minutesUntilNextStage(99999)).toBeNull());
});
