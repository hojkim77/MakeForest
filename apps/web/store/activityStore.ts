import { create } from 'zustand';
import type { MapUser } from '@makeforest/types';

export type ActivityMap = Record<string, number>;

interface ActivityState {
  activity: ActivityMap;
  activeUsers: MapUser[];
  setActivity: (activity: ActivityMap) => void;
  setActiveUsers: (users: MapUser[]) => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activity: {},
  activeUsers: [],
  setActivity: (activity) => set({ activity }),
  setActiveUsers: (activeUsers) => set({ activeUsers }),
}));
