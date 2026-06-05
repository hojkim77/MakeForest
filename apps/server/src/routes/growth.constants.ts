// Single source of truth for creature growth thresholds, expressed in focus minutes.
// Replaces the duplicate PERSONAL_STAGE_THRESHOLDS arrays in water.logic.ts and guide.ts.
//
// Derivation: legacy water-based thresholds [0,12,36,72,132,216,336,504,744,1080] × 30 min/water.
// For legacy 30-min users the stage values are numerically identical — lossless migration.

export const PERSONAL_STAGE_MIN_THRESHOLDS = [
  0, 360, 1080, 2160, 3960, 6480, 10080, 15120, 22320, 32400,
] as const;

export function calcPersonalStage(totalFocusMinutes: number): number {
  for (let i = PERSONAL_STAGE_MIN_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalFocusMinutes >= PERSONAL_STAGE_MIN_THRESHOLDS[i]!) return i;
  }
  return 0;
}

export function minutesUntilNextStage(totalFocusMinutes: number): number | null {
  const stage = calcPersonalStage(totalFocusMinutes);
  if (stage >= PERSONAL_STAGE_MIN_THRESHOLDS.length - 1) return null;
  const next = PERSONAL_STAGE_MIN_THRESHOLDS[stage + 1]!;
  return Math.max(0, next - totalFocusMinutes);
}
