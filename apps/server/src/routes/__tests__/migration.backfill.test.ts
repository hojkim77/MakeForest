// Migration backfill verification tests.
// Simulates the backfill logic: totalFocusMinutes = totalWaterCount × 30
// and verifies stage is numerically identical for legacy 30-min users.

import { calcPersonalStage } from '../growth.constants';

// Mirrors the legacy water-based stage function
const LEGACY_THRESHOLDS = [0, 12, 36, 72, 132, 216, 336, 504, 744, 1080];
function legacyStage(waterCount: number): number {
  for (let i = LEGACY_THRESHOLDS.length - 1; i >= 0; i--) {
    if (waterCount >= LEGACY_THRESHOLDS[i]!) return i;
  }
  return 0;
}

// The backfill: totalFocusMinutes := totalWaterCount × 30
function backfillFocusMinutes(totalWaterCount: number): number {
  return totalWaterCount * 30;
}

describe('migration backfill — totalFocusMinutes = totalWaterCount × 30', () => {
  const testCases = [0, 1, 11, 12, 35, 36, 71, 72, 131, 132, 215, 216, 335, 336, 503, 504, 743, 744, 1079, 1080, 2000];

  for (const waterCount of testCases) {
    it(`waterCount=${waterCount}: stage 동일 보장`, () => {
      const focusMinutes = backfillFocusMinutes(waterCount);
      const newStage = calcPersonalStage(focusMinutes);
      const oldStage = legacyStage(waterCount);
      expect(newStage).toBe(oldStage);
    });
  }
});

describe('migration backfill — totalWaterCount 역산', () => {
  it('water=0 → focus=0', () => expect(backfillFocusMinutes(0)).toBe(0));
  it('water=12 → focus=360', () => expect(backfillFocusMinutes(12)).toBe(360));
  it('water=36 → focus=1080', () => expect(backfillFocusMinutes(36)).toBe(1080));
  it('water=1080 → focus=32400', () => expect(backfillFocusMinutes(1080)).toBe(32400));
});
