import type { CreatureType } from '@makeforest/types';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function getSeason(date: Date): Season {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function pickCreatureType(
  actualSec: number,
  season: Season,
  rng: () => number = Math.random,
): CreatureType {
  const pools: Record<string, CreatureType[]> = {
    seed:  ['SEED', 'SPROUT'],
    grass: ['GRASS', 'FLOWER_A', 'FLOWER_B'],
    small: ['SAPLING', 'MUSHROOM', 'ROCK'],
    mid:   ['OAK', 'PINE', 'BAMBOO'],
    big:   ['BIG_OAK', 'CHERRY', 'RARE_ANIMAL'],
  };

  let pool: CreatureType[];
  if (actualSec < 30 * 60)      pool = pools['seed']!;
  else if (actualSec < 60 * 60) pool = pools['grass']!;
  else if (actualSec < 2 * 60 * 60) pool = pools['small']!;
  else if (actualSec < 3 * 60 * 60) pool = pools['mid']!;
  else                           pool = pools['big']!;

  const seasonBonus: Partial<Record<Season, CreatureType[]>> = {
    spring: ['FLOWER_A', 'FLOWER_B', 'CHERRY'],
    summer: ['GRASS', 'BAMBOO'],
    autumn: ['MUSHROOM', 'OAK'],
    winter: ['PINE', 'BIG_OAK'],
  };
  const bonus = seasonBonus[season] ?? [];
  const weighted = [...pool, ...bonus.filter((t) => pool.includes(t))];

  return weighted[Math.floor(rng() * weighted.length)]!;
}
