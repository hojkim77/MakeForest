export interface MissionData {
  creatureType: string;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
}

export function makeMission(overrides: Partial<MissionData> = {}): MissionData {
  return {
    creatureType: 'MUSHROOM',
    targetCount: 50,
    currentCount: 0,
    isCompleted: false,
    ...overrides,
  };
}
