import { calcCollectionTarget, pickDailyCreature, COLLECTION_CREATURES } from '../collection.logic';

describe('calcCollectionTarget — 활성 유저 수 기반 목표량 (세션 기준, 절반)', () => {
  it('0명 → 최소값 4', () => expect(calcCollectionTarget(0)).toBe(4));
  it('1명 → max(4, round(3)) = 4 (최소값 유지)', () => expect(calcCollectionTarget(1)).toBe(4));
  it('2명 → max(4, round(6)) = 6', () => expect(calcCollectionTarget(2)).toBe(6));
  it('5명 → max(4, round(15)) = 15', () => expect(calcCollectionTarget(5)).toBe(15));
  it('15명 → max(4, round(45)) = 45', () => expect(calcCollectionTarget(15)).toBe(45));
  it('50명 → max(4, round(150)) = 150', () => expect(calcCollectionTarget(50)).toBe(150));
});

describe('pickDailyCreature — 동코드+날짜 기반 결정론적 생명체 선택', () => {
  it('같은 입력 → 같은 결과 (결정론적)', () => {
    expect(pickDailyCreature('1111010100', '2025-05-16'))
      .toBe(pickDailyCreature('1111010100', '2025-05-16'));
  });

  it('반환값이 유효한 생명체 타입', () => {
    const result = pickDailyCreature('1111010100', '2025-05-16');
    expect(COLLECTION_CREATURES).toContain(result);
  });

  it('서로 다른 동코드가 서로 다른 생명체를 반환할 수 있음', () => {
    const codes = ['1111010100', '2621010100', '3611010100', '4111010100', '2614510900'];
    const results = codes.map((dc) => pickDailyCreature(dc, '2025-05-16'));
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it('서로 다른 날짜가 서로 다른 생명체를 반환할 수 있음', () => {
    const dates = ['2025-05-01', '2025-05-08', '2025-05-15', '2025-05-22', '2025-05-29'];
    const results = dates.map((d) => pickDailyCreature('1111010100', d));
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });
});
