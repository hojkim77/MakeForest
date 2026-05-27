export function determineFriendStatus(
  hasActiveSession: boolean,
  hasTodaySession: boolean,
): 'RUNNING' | 'IDLE' | 'OFFLINE' {
  if (hasActiveSession) return 'RUNNING';
  if (hasTodaySession) return 'IDLE';
  return 'OFFLINE';
}
