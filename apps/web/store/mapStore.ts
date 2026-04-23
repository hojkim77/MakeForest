import { create } from 'zustand';
import type { ZoomLevel } from '@makeforest/types';

type MapMode = 'pixel' | 'forest';

interface MapState {
  zoomLevel: ZoomLevel;
  centerLat: number;
  centerLng: number;
  focusedDongCode: string | null;
  mapMode: MapMode;
  setZoom: (level: ZoomLevel) => void;
  setCenter: (lat: number, lng: number) => void;
  focusDong: (dongCode: string | null) => void;
  setMapMode: (mode: MapMode) => void;
}

export const useMapStore = create<MapState>((set) => ({
  zoomLevel: 2,
  centerLat: 36.5,
  centerLng: 127.5,
  focusedDongCode: null,
  mapMode: 'pixel',

  setZoom: (level) => set({ zoomLevel: level }),
  setCenter: (lat, lng) => set({ centerLat: lat, centerLng: lng }),
  focusDong: (dongCode) => set({ focusedDongCode: dongCode }),
  setMapMode: (mode) => set({ mapMode: mode }),
}));
