import { create } from 'zustand';

type PanelTab = 'collection' | 'ranking' | null;

interface PanelState {
  activeTab: PanelTab;
  toggleTab: (tab: 'collection' | 'ranking') => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  activeTab: null,
  toggleTab: (tab) => set((s) => ({ activeTab: s.activeTab === tab ? null : tab })),
}));
