import { aggregateRegionRankings } from '../ranking.logic';

function makeMap(entries: [string, { regionKey: string; regionName: string }][]) {
  return new Map(entries);
}

describe('aggregateRegionRankings — 기본 집계', () => {
  it('같은 regionKey의 dong들은 waterCount가 합산된다', () => {
    const sigunguMap = makeMap([
      ['111', { regionKey: 'R1', regionName: '강남구' }],
      ['112', { regionKey: 'R1', regionName: '강남구' }],
    ]);
    const result = aggregateRegionRankings(
      [{ dongCode: '111', waterCount: 5 }, { dongCode: '112', waterCount: 3 }],
      sigunguMap,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.totalWater).toBe(8);
    expect(result[0]!.regionName).toBe('강남구');
  });

  it('sigunguMap에 없는 dongCode는 무시된다', () => {
    const sigunguMap = makeMap([['111', { regionKey: 'R1', regionName: '강남구' }]]);
    const result = aggregateRegionRankings(
      [{ dongCode: '111', waterCount: 5 }, { dongCode: '999', waterCount: 100 }],
      sigunguMap,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.totalWater).toBe(5);
  });
});

describe('aggregateRegionRankings — 정렬 및 순위', () => {
  it('totalWater 내림차순으로 rank가 부여된다', () => {
    const sigunguMap = makeMap([
      ['111', { regionKey: 'R1', regionName: '강남구' }],
      ['222', { regionKey: 'R2', regionName: '마포구' }],
    ]);
    const result = aggregateRegionRankings(
      [{ dongCode: '222', waterCount: 10 }, { dongCode: '111', waterCount: 30 }],
      sigunguMap,
    );
    expect(result[0]!.rank).toBe(1);
    expect(result[0]!.regionName).toBe('강남구');
    expect(result[1]!.rank).toBe(2);
    expect(result[1]!.regionName).toBe('마포구');
  });

  it('limit 적용: 기본 20개 초과 시 잘린다', () => {
    const sigunguMap = makeMap(
      Array.from({ length: 25 }, (_, i) => [
        `${i}`,
        { regionKey: `R${i}`, regionName: `구${i}` },
      ]),
    );
    const grouped = Array.from({ length: 25 }, (_, i) => ({ dongCode: `${i}`, waterCount: i + 1 }));
    const result = aggregateRegionRankings(grouped, sigunguMap);
    expect(result).toHaveLength(20);
  });
});

describe('aggregateRegionRankings — 엣지 케이스', () => {
  it('빈 입력이면 빈 배열 반환', () => {
    expect(aggregateRegionRankings([], new Map())).toEqual([]);
  });
});
