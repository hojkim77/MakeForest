export type CreatureType =
  // 씨앗류 (1분~30분)
  | 'SEED'
  | 'SPROUT'
  // 풀·꽃류 (30분~1시간)
  | 'GRASS'
  | 'FLOWER_A'
  | 'FLOWER_B'
  // 작은 나무 (1시간~2시간)
  | 'SAPLING'
  | 'MUSHROOM'
  | 'ROCK'
  // 중간 나무 (2시간~3시간)
  | 'OAK'
  | 'PINE'
  | 'BAMBOO'
  // 큰 나무·희귀 (3시간~5시간)
  | 'BIG_OAK'
  | 'CHERRY'
  | 'RARE_ANIMAL';

export type ForestBaseLevel = 'BARREN' | 'SPROUT' | 'MEADOW' | 'FOREST' | 'DENSE_FOREST';

export interface ForestObject {
  id: string;
  userId: string;
  sessionId: string;
  dongCode: string;
  forestX: number;
  forestY: number;
  creatureType: CreatureType;
  harvestedAt: Date;
  date: string; // "YYYY-MM-DD" KST
}

export interface HarvestResult {
  forestObject: ForestObject;
}

export interface ForestData {
  objects: ForestObject[];
  baseLevel: ForestBaseLevel;
}
