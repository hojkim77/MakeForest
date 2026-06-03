export interface CollectionData {
  creatureType: string;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
}

export function makeCollection(overrides: Partial<CollectionData> = {}): CollectionData {
  return {
    creatureType: 'MUSHROOM',
    targetCount: 50,
    currentCount: 0,
    isCompleted: false,
    ...overrides,
  };
}
