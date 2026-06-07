// 미션 배정 확률 풀 (중복 = 가중치): GRASS 최빈, RARE_ANIMAL 최소
const CREATURE_POOL = [
  'GRASS', 'GRASS', 'GRASS', 'GRASS',
  'FLOWER_A', 'FLOWER_A',
  'FLOWER_B', 'FLOWER_B',
  'MUSHROOM', 'MUSHROOM',
  'SAPLING', 'ROCK', 'BAMBOO', 'CHERRY', 'RARE_ANIMAL',
] as const;

export const MISSION_CREATURES = [
  'GRASS', 'FLOWER_A', 'FLOWER_B', 'SAPLING',
  'MUSHROOM', 'ROCK', 'BAMBOO', 'CHERRY', 'RARE_ANIMAL',
] as const;

export type MissionCreatureType = typeof MISSION_CREATURES[number];

// 활성 유저 수 기반 목표량
export function calcMissionTarget(activeUserCount: number): number {
  return Math.max(4, Math.round(activeUserCount * 3));
}

// 지역코드 + 날짜 기반 결정론적 생명체 배정 (같은 지역은 같은 날 같은 생명체)
export function pickDailyCreature(regionCode: string, date: string): MissionCreatureType {
  const key = `${regionCode}:${date}`;
  const hash = key.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CREATURE_POOL[hash % CREATURE_POOL.length]!;
}
