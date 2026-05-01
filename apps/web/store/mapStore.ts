import { create } from 'zustand';
import type { ZoomLevel } from '@makeforest/types';

type MapMode = 'pixel' | 'forest';

interface MapState {
  zoomLevel: ZoomLevel;
  centerLat: number;
  centerLng: number;
  focusedRegionCode: string | null;
  mapMode: MapMode;
  setZoom: (level: ZoomLevel) => void;
  setCenter: (lat: number, lng: number) => void;
  focusRegion: (regionCode: string | null) => void;
  setMapMode: (mode: MapMode) => void;
}

export const useMapStore = create<MapState>((set) => ({
  zoomLevel: 2,
  centerLat: 36.5,
  centerLng: 127.5,
  focusedRegionCode: null,
  mapMode: 'pixel',

  setZoom: (level) => set({ zoomLevel: level }),
  setCenter: (lat, lng) => set({ centerLat: lat, centerLng: lng }),
  focusRegion: (regionCode) => set({ focusedRegionCode: regionCode }),
  setMapMode: (mode) => set({ mapMode: mode }),
}));
