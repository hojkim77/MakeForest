export const LAT_MIN = 33.0, LAT_MAX = 38.9;
export const LNG_MIN = 124.6, LNG_MAX = 131.0;
export const GRID_W = 250, GRID_H = 290;

export function toPixel(lat: number, lng: number): { pixelX: number; pixelY: number } {
  return {
    pixelX: Math.max(0, Math.min(GRID_W - 1, Math.round(((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * GRID_W))),
    pixelY: Math.max(0, Math.min(GRID_H - 1, Math.round(((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * GRID_H))),
  };
}
