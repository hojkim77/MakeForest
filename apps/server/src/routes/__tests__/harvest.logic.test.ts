import { getSeason, pickCreatureType, type Season } from '../harvest.logic';
import type { CreatureType } from '@makeforest/types';

describe('getSeason', () => {
  const cases: Array<[string, Season]> = [
    ['2024-03-01', 'spring'],
    ['2024-05-31', 'spring'],
    ['2024-06-01', 'summer'],
    ['2024-08-31', 'summer'],
    ['2024-09-01', 'autumn'],
    ['2024-11-30', 'autumn'],
    ['2024-12-01', 'winter'],
    ['2024-02-29', 'winter'],
    ['2024-01-15', 'winter'],
  ];

  it.each(cases)('%s → %s', (dateStr, expected) => {
    expect(getSeason(new Date(dateStr))).toBe(expected);
  });
});

describe('pickCreatureType — 시간대별 풀', () => {
  const first = () => 0;       // pool[0]
  const last  = () => 0.9999;  // pool[마지막]

  const SEED_POOL:  CreatureType[] = ['SEED', 'SPROUT'];
  const GRASS_POOL: CreatureType[] = ['GRASS', 'FLOWER_A', 'FLOWER_B'];
  const SMALL_POOL: CreatureType[] = ['SAPLING', 'MUSHROOM', 'ROCK'];
  const MID_POOL:   CreatureType[] = ['OAK', 'PINE', 'BAMBOO'];
  const BIG_POOL:   CreatureType[] = ['BIG_OAK', 'CHERRY', 'RARE_ANIMAL'];

  describe('구간 분류', () => {
    it('0초 → seed 풀', () => {
      expect(SEED_POOL).toContain(pickCreatureType(0, 'spring', first));
      expect(SEED_POOL).toContain(pickCreatureType(0, 'spring', last));
    });
    it('1799초 (30분 미만) → seed 풀', () => {
      expect(SEED_POOL).toContain(pickCreatureType(1799, 'autumn', first));
    });
    it('1800초 (정확히 30분) → grass 풀', () => {
      expect(GRASS_POOL).toContain(pickCreatureType(1800, 'winter', first));
    });
    it('3599초 (1시간 미만) → grass 풀', () => {
      expect(GRASS_POOL).toContain(pickCreatureType(3599, 'winter', first));
    });
    it('3600초 (정확히 1시간) → small 풀', () => {
      expect(SMALL_POOL).toContain(pickCreatureType(3600, 'winter', first));
    });
    it('7200초 (정확히 2시간) → mid 풀', () => {
      expect(MID_POOL).toContain(pickCreatureType(7200, 'winter', first));
    });
    it('10800초 (정확히 3시간) → big 풀', () => {
      expect(BIG_POOL).toContain(pickCreatureType(10800, 'winter', first));
    });
  });

  describe('계절 보정', () => {
    it('spring + grass 풀 → FLOWER_A/FLOWER_B 가중치 추가 (pool 크기 5)', () => {
      // weighted = ['GRASS','FLOWER_A','FLOWER_B','FLOWER_A','FLOWER_B']
      // rng=0.99 → index 4 → 'FLOWER_B'
      const result = pickCreatureType(1800, 'spring', last);
      expect(result).toBe('FLOWER_B');
    });

    it('spring + grass 풀 → rng=0 → GRASS (첫 번째 원소)', () => {
      expect(pickCreatureType(1800, 'spring', first)).toBe('GRASS');
    });

    it('winter + grass 풀 → 보정 없음 (PINE, BIG_OAK이 grass 풀에 없음)', () => {
      // weighted = ['GRASS','FLOWER_A','FLOWER_B'] (크기 3)
      const result = pickCreatureType(1800, 'winter', last);
      expect(GRASS_POOL).toContain(result);
    });

    it('summer + mid 풀 → BAMBOO 가중치 추가', () => {
      // pool = ['OAK','PINE','BAMBOO'], bonus = ['BAMBOO']
      // weighted = ['OAK','PINE','BAMBOO','BAMBOO'] → last → 'BAMBOO'
      expect(pickCreatureType(7200, 'summer', last)).toBe('BAMBOO');
    });

    it('autumn + small 풀 → MUSHROOM 가중치 추가', () => {
      // pool = ['SAPLING','MUSHROOM','ROCK'], bonus = ['MUSHROOM']
      // weighted = ['SAPLING','MUSHROOM','ROCK','MUSHROOM'] → last → 'MUSHROOM'
      expect(pickCreatureType(3600, 'autumn', last)).toBe('MUSHROOM');
    });
  });
});
