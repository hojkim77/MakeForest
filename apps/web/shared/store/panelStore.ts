import { create } from 'zustand';

interface PanelState {
  collectionDrawerOpen: boolean;
  toggleCollectionDrawer: () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  collectionDrawerOpen: false,
  toggleCollectionDrawer: () => set((s) => ({ collectionDrawerOpen: !s.collectionDrawerOpen })),
}));
