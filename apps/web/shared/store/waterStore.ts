import { create } from 'zustand';
import { calcGrowthPercent } from '@/shared/utils/creature';

type CreatureStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface WaterState {
  waterCount: number;
  creatureStage: CreatureStage;
  totalWaterCount: number;
  growthPercent: number;
  isWatering: boolean;
  init: (data: { waterCount: number; creatureStage: number; totalWaterCount: number }) => void;
  applyWaterResponse: (data: { myWaterCount: number; userCreature: { stage: number; totalWaterCount: number } }) => void;
  setIsWatering: (v: boolean) => void;
}

export const useWaterStore = create<WaterState>((set) => ({
  waterCount: 0,
  creatureStage: 0,
  totalWaterCount: 0,
  growthPercent: 0,
  isWatering: false,

  init: ({ waterCount, creatureStage, totalWaterCount }) =>
    set({
      waterCount,
      creatureStage: Math.min(creatureStage, 9) as CreatureStage,
      totalWaterCount,
      growthPercent: calcGrowthPercent(totalWaterCount, creatureStage),
    }),

  applyWaterResponse: ({ myWaterCount, userCreature }) =>
    set({
      waterCount: myWaterCount,
      creatureStage: Math.min(userCreature.stage, 9) as CreatureStage,
      totalWaterCount: userCreature.totalWaterCount,
      growthPercent: calcGrowthPercent(userCreature.totalWaterCount, userCreature.stage),
    }),

  setIsWatering: (v) => set({ isWatering: v }),
}));
