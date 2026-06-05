// Tests for the timer config + goal validators (app-layer logic, not DB checks)

// Timer config validator (mirrors sessions.ts server validation)
function validateTimerConfig(focusLengthMin: number, segmentCount: number):
  { ok: true } | { ok: false; code: string } {
  if (focusLengthMin < 5 || focusLengthMin > 120 || focusLengthMin % 5 !== 0) {
    return { ok: false, code: 'INVALID_FOCUS_LENGTH' };
  }
  if (segmentCount < 1) {
    return { ok: false, code: 'INVALID_SEGMENT_COUNT' };
  }
  if (focusLengthMin * segmentCount > 1440) {
    return { ok: false, code: 'DAILY_CAP_EXCEEDED' };
  }
  return { ok: true };
}

// Goal validator (mirrors sessions.ts server validation)
function validateGoal(todayGoal: string): { ok: true } | { ok: false; code: string } {
  const trimmed = todayGoal.trim();
  if (trimmed.length === 0) return { ok: false, code: 'GOAL_EMPTY' };
  if (trimmed.length > 50) return { ok: false, code: 'GOAL_TOO_LONG' };
  return { ok: true };
}

describe('timer config validator — focusLengthMin', () => {
  it('5분 → 유효', () => expect(validateTimerConfig(5, 1).ok).toBe(true));
  it('120분 → 유효', () => expect(validateTimerConfig(120, 1).ok).toBe(true));
  it('4분 → 무효 (하한 미달)', () => expect(validateTimerConfig(4, 1)).toEqual({ ok: false, code: 'INVALID_FOCUS_LENGTH' }));
  it('121분 → 무효 (상한 초과)', () => expect(validateTimerConfig(121, 1)).toEqual({ ok: false, code: 'INVALID_FOCUS_LENGTH' }));
  it('7분 → 무효 (5분 단위 아님)', () => expect(validateTimerConfig(7, 1)).toEqual({ ok: false, code: 'INVALID_FOCUS_LENGTH' }));
  it('30분 → 유효', () => expect(validateTimerConfig(30, 12).ok).toBe(true));
  it('50분 → 유효', () => expect(validateTimerConfig(50, 10).ok).toBe(true));
  it('90분 → 유효', () => expect(validateTimerConfig(90, 4).ok).toBe(true));
  it('5분 → 유효 (최솟값)', () => expect(validateTimerConfig(5, 288).ok).toBe(true));
});

describe('timer config validator — segmentCount', () => {
  it('1회 → 유효', () => expect(validateTimerConfig(30, 1).ok).toBe(true));
  it('0회 → 무효', () => expect(validateTimerConfig(30, 0)).toEqual({ ok: false, code: 'INVALID_SEGMENT_COUNT' }));
  it('-1회 → 무효', () => expect(validateTimerConfig(30, -1)).toEqual({ ok: false, code: 'INVALID_SEGMENT_COUNT' }));
});

describe('timer config validator — 24h cap', () => {
  it('5×288 = 1440분 → 유효 (경계값)', () => expect(validateTimerConfig(5, 288).ok).toBe(true));
  it('5×289 = 1445분 → 무효', () => expect(validateTimerConfig(5, 289)).toEqual({ ok: false, code: 'DAILY_CAP_EXCEEDED' }));
  it('120×12 = 1440분 → 유효', () => expect(validateTimerConfig(120, 12).ok).toBe(true));
  it('120×13 = 1560분 → 무효', () => expect(validateTimerConfig(120, 13)).toEqual({ ok: false, code: 'DAILY_CAP_EXCEEDED' }));
  it('30×12 = 360분 → 유효 (기본값)', () => expect(validateTimerConfig(30, 12).ok).toBe(true));
});

describe('goal validator', () => {
  it('빈 문자열 → GOAL_EMPTY', () => expect(validateGoal('')).toEqual({ ok: false, code: 'GOAL_EMPTY' }));
  it('공백만 → GOAL_EMPTY', () => expect(validateGoal('   ')).toEqual({ ok: false, code: 'GOAL_EMPTY' }));
  it('1자 → 유효', () => expect(validateGoal('a').ok).toBe(true));
  it('50자 → 유효', () => expect(validateGoal('a'.repeat(50)).ok).toBe(true));
  it('51자 → GOAL_TOO_LONG', () => expect(validateGoal('a'.repeat(51))).toEqual({ ok: false, code: 'GOAL_TOO_LONG' }));
  it('앞뒤 공백 trim 후 50자 → 유효', () => expect(validateGoal('  ' + 'a'.repeat(50) + '  ').ok).toBe(true));
  it('앞뒤 공백 trim 후 51자 → GOAL_TOO_LONG', () => expect(validateGoal(' ' + 'a'.repeat(51) + ' ')).toEqual({ ok: false, code: 'GOAL_TOO_LONG' }));
});
