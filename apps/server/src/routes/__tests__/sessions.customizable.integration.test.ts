import supertest from 'supertest';
import { app } from '../../app';
import { truncateAll, getTestPrisma } from '../../__tests__/helpers/testDb';
import { makeUser } from '../../__tests__/helpers/factories';
import { internalAuthHeader } from '../../__tests__/helpers/auth';

const api = supertest(app);

beforeEach(async () => {
  await truncateAll();
});

// ── helpers ───────────────────────────────────────────────────────────────────

function startSession(userId: string, dongCode: string, todayGoal = '오늘 집중', focusLengthMin = 30, segmentCount = 12) {
  return api
    .post('/sessions')
    .set(internalAuthHeader())
    .send({ userId, dongCode, todos: [], todayGoal, focusLengthMin, segmentCount });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /sessions — goal 검증', () => {
  it('목표 없으면 400 GOAL_REQUIRED', async () => {
    const user = await makeUser();
    const res = await startSession(user.id, user.dongCode!, '  ').expect(400);
    expect(res.body.code).toBe('GOAL_REQUIRED');
  });

  it('앞뒤 공백 trim 후 검증', async () => {
    const user = await makeUser();
    const res = await startSession(user.id, user.dongCode!, '  집중하기  ').expect(200);
    expect(res.body.todayGoal).toBe('집중하기');
  });

  it('51자 목표 → 400 GOAL_TOO_LONG', async () => {
    const user = await makeUser();
    const res = await startSession(user.id, user.dongCode!, 'a'.repeat(51)).expect(400);
    expect(res.body.code).toBe('GOAL_TOO_LONG');
  });
});

describe('POST /sessions — 타이머 설정 검증', () => {
  it('5분 단위 아님 → 400 INVALID_FOCUS_LENGTH', async () => {
    const user = await makeUser();
    const res = await startSession(user.id, user.dongCode!, '목표', 7, 5).expect(400);
    expect(res.body.code).toBe('INVALID_FOCUS_LENGTH');
  });

  it('focusLengthMin < 5 → 400 INVALID_FOCUS_LENGTH', async () => {
    const user = await makeUser();
    const res = await startSession(user.id, user.dongCode!, '목표', 4, 5).expect(400);
    expect(res.body.code).toBe('INVALID_FOCUS_LENGTH');
  });

  it('segmentCount < 1 → 400 INVALID_SEGMENT_COUNT', async () => {
    const user = await makeUser();
    const res = await startSession(user.id, user.dongCode!, '목표', 30, 0).expect(400);
    expect(res.body.code).toBe('INVALID_SEGMENT_COUNT');
  });

  it('product > 1440 → 400 DAILY_CAP_EXCEEDED', async () => {
    const user = await makeUser();
    const res = await startSession(user.id, user.dongCode!, '목표', 5, 289).expect(400);
    expect(res.body.code).toBe('DAILY_CAP_EXCEEDED');
  });
});

describe('POST /sessions — 목표 + 설정 + 잠금', () => {
  it('목표 + 설정 있으면 200 + 세션 시작', async () => {
    const user = await makeUser();
    const res = await startSession(user.id, user.dongCode!, '오늘 집중', 50, 10).expect(200);

    expect(res.body.focusLengthMin).toBe(50);
    expect(res.body.segmentCount).toBe(10);
    expect(res.body.todayGoal).toBe('오늘 집중');
    expect(res.body.isNewSession).toBe(true);
  });

  it('첫 RUNNING 후 재시작 → 409 SESSION_ALREADY_STARTED', async () => {
    const user = await makeUser();
    await startSession(user.id, user.dongCode!).expect(200);

    const res = await startSession(user.id, user.dongCode!).expect(409);
    expect(res.body.code).toBe('SESSION_ALREADY_STARTED');
  });

  it('User.lastFocusLengthMin / lastSegmentCount 갱신', async () => {
    const user = await makeUser();
    await startSession(user.id, user.dongCode!, '목표', 50, 10).expect(200);

    const prisma = getTestPrisma();
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: { lastFocusLengthMin: true, lastSegmentCount: true },
    });
    expect(updated?.lastFocusLengthMin).toBe(50);
    expect(updated?.lastSegmentCount).toBe(10);
  });
});

describe('GET /sessions/today — stage machine (client-derived)', () => {
  it('세션 없으면 200 + sessionStatus=NONE', async () => {
    const user = await makeUser();
    const res = await api
      .get(`/sessions/today?userId=${user.id}`)
      .set(internalAuthHeader())
      .expect(200);

    expect(res.body.sessionStatus).toBe('NONE');
    expect(res.body.focusLengthMin).toBe(30);
    expect(res.body.segmentCount).toBe(12);
  });

  it('세션 시작 후 → sessionStatus=RUNNING, todayGoal 반환', async () => {
    const user = await makeUser();
    await startSession(user.id, user.dongCode!, '테스트 목표', 30, 12);

    const res = await api
      .get(`/sessions/today?userId=${user.id}`)
      .set(internalAuthHeader())
      .expect(200);

    expect(res.body.sessionStatus).toBe('RUNNING');
    expect(res.body.todayGoal).toBe('테스트 목표');
    // R1: stage, goalLockedAt, configLockedAt, configPersisted are not returned
    expect(res.body.stage).toBeUndefined();
    expect(res.body.goalLockedAt).toBeUndefined();
    expect(res.body.configLockedAt).toBeUndefined();
    expect(res.body.configPersisted).toBeUndefined();
  });

  it('존재하지 않는 userId → 404', async () => {
    await api
      .get('/sessions/today?userId=nonexistent')
      .set(internalAuthHeader())
      .expect(404);
  });
});
