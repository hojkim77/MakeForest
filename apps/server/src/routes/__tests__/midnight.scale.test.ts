// Tests for midnight batch auto-water threshold scaling.
// Threshold formula: 2 × focusLengthMin × 60 seconds
// Per-user cap: focusLengthMin × segmentCount × 60 seconds

function autoWaterThreshold(focusLengthMin: number): number {
  return 2 * focusLengthMin * 60;
}

function perUserCapSec(focusLengthMin: number, segmentCount: number): number {
  return focusLengthMin * segmentCount * 60;
}

describe('midnight auto-water threshold', () => {
  it('30×12 (기본값): threshold = 3600초 (1시간)', () => {
    expect(autoWaterThreshold(30)).toBe(3600);
  });

  it('30×12: 레거시 7200초 → 30분 기준 2배 = 3600초 (더 낮음 — 알려진 변경)', () => {
    // Legacy was 7200s flat. New is 2×30×60 = 3600s. Same semantic: 2 segments.
    expect(autoWaterThreshold(30)).toBe(60 * 30 * 2);
  });

  it('50×10: threshold = 6000초 (100분)', () => {
    expect(autoWaterThreshold(50)).toBe(6000);
  });

  it('90×4: threshold = 10800초 (3시간)', () => {
    expect(autoWaterThreshold(90)).toBe(10800);
  });

  it('5×288: threshold = 600초 (10분)', () => {
    expect(autoWaterThreshold(5)).toBe(600);
  });

  it('120×12: threshold = 14400초 (4시간)', () => {
    expect(autoWaterThreshold(120)).toBe(14400);
  });
});

describe('midnight per-user cap', () => {
  it('30×12 = 21600초 (6시간 — 기존 동일)', () => {
    expect(perUserCapSec(30, 12)).toBe(21600);
  });

  it('50×10 = 30000초 (8.3시간)', () => {
    expect(perUserCapSec(50, 10)).toBe(30000);
  });

  it('90×4 = 21600초', () => {
    expect(perUserCapSec(90, 4)).toBe(21600);
  });

  it('5×288 = 86400초 (24시간)', () => {
    expect(perUserCapSec(5, 288)).toBe(86400);
  });

  it('120×12 = 86400초 (24시간)', () => {
    expect(perUserCapSec(120, 12)).toBe(86400);
  });
});

describe('midnight threshold qualifying boundary', () => {
  it('30min user: 3599초 → 임계 미달 (skip)', () => {
    expect(3599 < autoWaterThreshold(30)).toBe(true);
  });

  it('30min user: 3600초 → 임계 도달 (qualify)', () => {
    expect(3600 >= autoWaterThreshold(30)).toBe(true);
  });

  it('5min user: 599초 → 임계 미달', () => {
    expect(599 < autoWaterThreshold(5)).toBe(true);
  });

  it('5min user: 600초 → 임계 도달', () => {
    expect(600 >= autoWaterThreshold(5)).toBe(true);
  });

  it('120min user: 14399초 → 임계 미달', () => {
    expect(14399 < autoWaterThreshold(120)).toBe(true);
  });

  it('120min user: 14400초 → 임계 도달', () => {
    expect(14400 >= autoWaterThreshold(120)).toBe(true);
  });
});
