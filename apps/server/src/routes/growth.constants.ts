// Single source of truth for creature growth thresholds, expressed in focus minutes.
//
// Derivation: legacy water-based thresholds [0,12,36,72,132,216,336,504,744,1080] × 30 min/water.
// For legacy 30-min users the stage values are numerically identical — lossless migration.

export const STAGE_THRESHOLDS_BY_FOCUS_MIN = [
  0, 360, 1080, 2160, 3960, 6480, 10080, 15120, 22320, 32400,
] as const;

export const MAX_STAGE = STAGE_THRESHOLDS_BY_FOCUS_MIN.length - 1;

export function calcPersonalStage(totalFocusMinutes: number): number {
  for (let i = STAGE_THRESHOLDS_BY_FOCUS_MIN.length - 1; i >= 0; i--) {
    if (totalFocusMinutes >= STAGE_THRESHOLDS_BY_FOCUS_MIN[i]!) return i;
  }
  return 0;
}

export function minutesUntilNextStage(totalFocusMinutes: number): number | null {
  const stage = calcPersonalStage(totalFocusMinutes);
  if (stage >= MAX_STAGE) return null;
  const next = STAGE_THRESHOLDS_BY_FOCUS_MIN[stage + 1]!;
  return Math.max(0, next - totalFocusMinutes);
}
