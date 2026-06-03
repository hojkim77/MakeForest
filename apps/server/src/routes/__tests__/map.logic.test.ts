import { toPixel, LAT_MIN, LAT_MAX, LNG_MIN, LNG_MAX, GRID_W, GRID_H } from '../map.logic';

describe('toPixel — 경계 좌표 클램핑', () => {
  it('위도 최솟값/경도 최솟값 → (0, GRID_H-1) 좌상단', () => {
    const { pixelX, pixelY } = toPixel(LAT_MIN, LNG_MIN);
    expect(pixelX).toBe(0);
    expect(pixelY).toBe(GRID_H - 1);
  });

  it('위도 최댓값/경도 최댓값 → (GRID_W-1, 0) 우하단', () => {
    const { pixelX, pixelY } = toPixel(LAT_MAX, LNG_MAX);
    expect(pixelX).toBe(GRID_W - 1);
    expect(pixelY).toBe(0);
  });

  it('범위 초과 위도(40도) → GRID_H-1 미만으로 클램프', () => {
    const { pixelY } = toPixel(40, 128);
    expect(pixelY).toBe(0); // 최대값으로 클램프
  });

  it('범위 초과 경도(140도) → GRID_W-1로 클램프', () => {
    const { pixelX } = toPixel(36, 140);
    expect(pixelX).toBe(GRID_W - 1);
  });
});

describe('toPixel — 좌표 → 픽셀 변환', () => {
  it('중앙 좌표는 그리드 중앙에 가까운 픽셀을 반환한다', () => {
    const centerLat = (LAT_MIN + LAT_MAX) / 2;
    const centerLng = (LNG_MIN + LNG_MAX) / 2;
    const { pixelX, pixelY } = toPixel(centerLat, centerLng);
    expect(pixelX).toBeCloseTo(GRID_W / 2, -1); // 10 픽셀 이내
    expect(pixelY).toBeCloseTo(GRID_H / 2, -1);
  });

  it('위도가 낮을수록(남쪽) pixelY가 커진다', () => {
    const { pixelY: north } = toPixel(38, 127);
    const { pixelY: south } = toPixel(35, 127);
    expect(south).toBeGreaterThan(north);
  });

  it('경도가 클수록(동쪽) pixelX가 커진다', () => {
    const { pixelX: west } = toPixel(37, 126);
    const { pixelX: east } = toPixel(37, 129);
    expect(east).toBeGreaterThan(west);
  });
});
