import { create } from 'zustand';

type CreatureStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface WaterState {
  waterCount: number;
  creatureStage: CreatureStage;
  growthPercent: number;
  isWatering: boolean;
  init: (data: { waterCount: number; creatureStage: number; growthPercent: number }) => void;
  applyWaterResponse: (data: { myWaterCount: number; userCreature: { stage: number } }) => void;
  setIsWatering: (v: boolean) => void;
}

export const useWaterStore = create<WaterState>((set) => ({
  waterCount: 0,
  creatureStage: 0,
  growthPercent: 0,
  isWatering: false,

  init: ({ waterCount, creatureStage, growthPercent }) =>
    set({
      waterCount,
      creatureStage: Math.min(creatureStage, 9) as CreatureStage,
      growthPercent,
    }),

  applyWaterResponse: ({ myWaterCount, userCreature }) =>
    set({
      waterCount: myWaterCount,
      creatureStage: Math.min(userCreature.stage, 9) as CreatureStage,
      growthPercent: Math.min(Math.round((myWaterCount / 12) * 100), 100),
    }),

  setIsWatering: (v) => set({ isWatering: v }),
}));
