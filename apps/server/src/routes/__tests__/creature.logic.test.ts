import { aggregateCreatureStats } from '../creature.logic';

describe('aggregateCreatureStats — 활성 유저 없음', () => {
  it('세션이 없으면 모든 값이 0', () => {
    expect(aggregateCreatureStats([], [])).toEqual({
      userCount: 0, avgStage: 0, maxStage: 0, totalWaterCount: 0,
    });
  });
});

describe('aggregateCreatureStats — 단일 유저', () => {
  it('물주기 5회, stage 1 → 그대로 반영', () => {
    const result = aggregateCreatureStats(
      [{ stage: 1 }],
      [{ waterCount: 5 }],
    );
    expect(result).toEqual({ userCount: 1, avgStage: 1, maxStage: 1, totalWaterCount: 5 });
  });
});

describe('aggregateCreatureStats — 복수 유저', () => {
  it('totalWaterCount는 모든 세션 waterCount 합산', () => {
    const { totalWaterCount } = aggregateCreatureStats(
      [{ stage: 2 }, { stage: 4 }],
      [{ waterCount: 3 }, { waterCount: 9 }],
    );
    expect(totalWaterCount).toBe(12);
  });

  it('avgStage는 반올림', () => {
    const { avgStage } = aggregateCreatureStats(
      [{ stage: 1 }, { stage: 2 }],
      [{ waterCount: 1 }, { waterCount: 1 }],
    );
    expect(avgStage).toBe(2); // (1+2)/2 = 1.5 → round = 2
  });

  it('maxStage는 가장 높은 단계', () => {
    const { maxStage } = aggregateCreatureStats(
      [{ stage: 0 }, { stage: 7 }, { stage: 3 }],
      [{ waterCount: 1 }, { waterCount: 1 }, { waterCount: 1 }],
    );
    expect(maxStage).toBe(7);
  });
});
