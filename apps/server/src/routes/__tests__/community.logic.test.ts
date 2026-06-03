import { getKstDateOffset } from '../community.logic';

describe('getKstDateOffset — KST 기준 날짜 오프셋', () => {
  it('오프셋 0 → 기준 날짜 그대로', () => {
    // UTC 2024-01-05T06:00:00Z = KST 2024-01-05 15:00:00
    const result = getKstDateOffset(0, new Date('2024-01-05T06:00:00Z'));
    expect(result).toBe('2024-01-05');
  });

  it('오프셋 1 → 하루 전', () => {
    const result = getKstDateOffset(1, new Date('2024-01-05T06:00:00Z'));
    expect(result).toBe('2024-01-04');
  });

  it('오프셋 6 → 6일 전', () => {
    const result = getKstDateOffset(6, new Date('2024-01-10T06:00:00Z'));
    expect(result).toBe('2024-01-04');
  });

  it('월 경계: 1월 1일 기준 1일 전 → 12월 31일', () => {
    const result = getKstDateOffset(1, new Date('2024-01-01T06:00:00Z'));
    expect(result).toBe('2023-12-31');
  });
});
