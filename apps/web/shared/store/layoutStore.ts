import { create } from 'zustand';

export type View = 'map' | 'panel';

interface LayoutState {
  view: View;
  setView: (v: View) => void;
}

export const useViewStore = create<LayoutState>((set) => ({
  view: 'map',
  setView: (v) => set({ view: v }),
}));
