type SessionRow = {
  todayGoal: string | null;
  focusLengthMin: number | null;
  segmentCount: number | null;
  status: string;
  id: string;
  startedAt: Date;
  waterCount: number;
} | null;

type UserDefaults = {
  lastFocusLengthMin: number | null;
  lastSegmentCount: number | null;
};

export function buildTodayState(session: SessionRow, userDefaults: UserDefaults) {
  const focusLengthMin = session?.focusLengthMin ?? userDefaults.lastFocusLengthMin ?? 30;
  const segmentCount = session?.segmentCount ?? userDefaults.lastSegmentCount ?? 12;
  const todayGoal = session?.todayGoal ?? null;

  let sessionStatus: 'NONE' | 'RUNNING' | 'IDLE' | 'PAUSED' | 'COMPLETED' | 'ABANDONED' = 'NONE';
  if (session) {
    const s = session.status;
    if (s === 'RUNNING' || s === 'IDLE' || s === 'PAUSED' || s === 'COMPLETED' || s === 'ABANDONED') {
      sessionStatus = s as typeof sessionStatus;
    }
  }

  return {
    todayGoal,
    focusLengthMin,
    segmentCount,
    totalDailyCapMin: focusLengthMin * segmentCount,
    sessionStatus,
    sessionId: session?.id ?? null,
    startedAt: session?.startedAt?.toISOString() ?? null,
    waterCount: session?.waterCount ?? 0,
  };
}
