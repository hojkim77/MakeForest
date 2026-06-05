import { create } from 'zustand';

interface SessionDraftState {
  goal: string;
  focusLengthMin: number | null;
  segmentCount: number | null;
  setGoal: (goal: string) => void;
  setFocusLengthMin: (value: number) => void;
  setSegmentCount: (value: number) => void;
  hydrate: (defaults: { focusLengthMin: number; segmentCount: number }) => void;
  reset: () => void;
}

export const useSessionDraftStore = create<SessionDraftState>((set, get) => ({
  goal: '',
  focusLengthMin: null,
  segmentCount: null,

  setGoal: (goal) => set({ goal }),

  setFocusLengthMin: (value) => set({ focusLengthMin: value }),

  setSegmentCount: (value) => set({ segmentCount: value }),

  hydrate: (defaults) => {
    const { focusLengthMin, segmentCount } = get();
    set({
      focusLengthMin: focusLengthMin ?? defaults.focusLengthMin,
      segmentCount: segmentCount ?? defaults.segmentCount,
    });
  },

  reset: () => set({ goal: '', focusLengthMin: null, segmentCount: null }),
}));
