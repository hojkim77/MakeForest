export function aggregateCreatureStats(
  creatures: { stage: number }[],
  sessions: { waterCount: number }[],
): { userCount: number; avgStage: number; maxStage: number; totalWaterCount: number } {
  const userCount = sessions.length;
  const totalWaterCount = sessions.reduce((sum, s) => sum + s.waterCount, 0);

  if (userCount === 0) {
    return { userCount: 0, avgStage: 0, maxStage: 0, totalWaterCount: 0 };
  }

  const avgStage = Math.round(creatures.reduce((sum, c) => sum + c.stage, 0) / userCount);
  const maxStage = creatures.length > 0 ? Math.max(...creatures.map((c) => c.stage)) : 0;

  return { userCount, avgStage, maxStage, totalWaterCount };
}
