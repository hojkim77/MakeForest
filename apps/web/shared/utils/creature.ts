// Web-side growth percent for the panel gauge UI.
// Water-based thresholds mirror the server's minute-based ones (×30) — see apps/server/src/routes/growth.constants.ts.

const STAGE_THRESHOLDS_BY_WATER = [0, 12, 36, 72, 132, 216, 336, 504, 744, 1080] as const;

export function calcGrowthPercent(totalWaterCount: number, stage: number): number {
  if (stage >= 9) return 100;
  const current = STAGE_THRESHOLDS_BY_WATER[stage]!;
  const next = STAGE_THRESHOLDS_BY_WATER[stage + 1]!;
  return Math.min(Math.round(((totalWaterCount - current) / (next - current)) * 100), 100);
}
