import { create } from 'zustand';

type PanelTab = 'mission' | 'ranking' | null;

interface PanelState {
  activeTab: PanelTab;
  toggleTab: (tab: 'mission' | 'ranking') => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  activeTab: null,
  toggleTab: (tab) => set((s) => ({ activeTab: s.activeTab === tab ? null : tab })),
}));
