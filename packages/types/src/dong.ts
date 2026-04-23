export interface Dong {
  code: string;
  name: string;
  sigunguCode: string;
  sidoCode: string;
  lat: number;
  lng: number;
}

export type ZoomLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface HeatmapData {
  [code: string]: number; // 활성 세션 수
}
