const STAGE_THRESHOLDS = [0, 12, 36, 72, 132, 216, 336, 504, 744, 1080] as const;

export function calcGrowthPercent(totalWaterCount: number, stage: number): number {
  if (stage >= 9) return 100;
  const current = STAGE_THRESHOLDS[stage]!;
  const next = STAGE_THRESHOLDS[stage + 1]!;
  return Math.min(Math.round(((totalWaterCount - current) / (next - current)) * 100), 100);
}
