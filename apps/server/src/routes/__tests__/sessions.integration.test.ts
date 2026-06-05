import supertest from 'supertest';
import { app } from '../../app';
import { truncateAll, getTestPrisma } from '../../__tests__/helpers/testDb';
import { makeUser } from '../../__tests__/helpers/factories';
import { internalAuthHeader } from '../../__tests__/helpers/auth';

const api = supertest(app);

beforeEach(async () => {
  await truncateAll();
});

async function prepareAndStartSession(userId: string, dongCode: string) {
  return api.post('/sessions').set(internalAuthHeader()).send({ userId, dongCode, todos: [], todayGoal: '테스트 목표', focusLengthMin: 30, segmentCount: 12 });
}

describe('POST /sessions — 세션 시작', () => {
  it('새 세션 생성 → sessionId 반환, isNewSession=true', async () => {
    const user = await makeUser();
    const res = await prepareAndStartSession(user.id, user.dongCode!);
    expect(res.status).toBe(200);

    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.isNewSession).toBe(true);
    expect(res.body.startedAt).toBeTruthy();
    expect(res.body.focusLengthMin).toBe(30);
    expect(res.body.segmentCount).toBe(12);
  });

  it('이미 시작된 세션 있으면 409 SESSION_ALREADY_STARTED', async () => {
    const user = await makeUser();
    await prepareAndStartSession(user.id, user.dongCode!);
    const res = await api
      .post('/sessions')
      .set(internalAuthHeader())
      .send({ userId: user.id, dongCode: user.dongCode, todos: [], todayGoal: '테스트', focusLengthMin: 30, segmentCount: 12 })
      .expect(409);
    expect(res.body.code).toBe('SESSION_ALREADY_STARTED');
  });

  it('인증 없으면 401', async () => {
    await api.post('/sessions').send({ userId: 'x', dongCode: '1168010100', todos: [], todayGoal: '목표', focusLengthMin: 30, segmentCount: 12 }).expect(401);
  });

  it('목표 없으면 400', async () => {
    const user = await makeUser();
    await api.post('/sessions').set(internalAuthHeader()).send({ userId: user.id, dongCode: user.dongCode, todos: [], todayGoal: '', focusLengthMin: 30, segmentCount: 12 }).expect(400);
  });

  it('설정 없으면 400 (focusLengthMin=0)', async () => {
    const user = await makeUser();
    await api.post('/sessions').set(internalAuthHeader()).send({ userId: user.id, dongCode: user.dongCode, todos: [], todayGoal: '목표', focusLengthMin: 0, segmentCount: 12 }).expect(400);
  });
});

describe('GET /sessions/today', () => {
  it('세션 없으면 200 + sessionStatus=NONE (기본 상태 반환)', async () => {
    const user = await makeUser();
    const res = await api
      .get(`/sessions/today?userId=${user.id}`)
      .set(internalAuthHeader())
      .expect(200);
    expect(res.body.sessionStatus).toBe('NONE');
  });

  it('존재하지 않는 userId → 404', async () => {
    await api
      .get('/sessions/today?userId=nonexistent-user-id')
      .set(internalAuthHeader())
      .expect(404);
  });

  it('세션 시작 후 → sessionStatus=RUNNING', async () => {
    const user = await makeUser();
    await prepareAndStartSession(user.id, user.dongCode!);
    const res = await api
      .get(`/sessions/today?userId=${user.id}`)
      .set(internalAuthHeader())
      .expect(200);
    expect(res.body.sessionStatus).toBe('RUNNING');
  });
});

describe('GET /sessions/:id', () => {
  it('존재하는 세션 → 200', async () => {
    const user = await makeUser();
    const { body } = await prepareAndStartSession(user.id, user.dongCode!);
    await api.get(`/sessions/${body.sessionId}`).set(internalAuthHeader()).expect(200);
  });

  it('없는 세션 → 404', async () => {
    await api.get('/sessions/nonexistent-id').set(internalAuthHeader()).expect(404);
  });
});

describe('PATCH /sessions/:id — 상태 변경', () => {
  it('complete 액션 → status=COMPLETED', async () => {
    const user = await makeUser();
    const { body } = await prepareAndStartSession(user.id, user.dongCode!);
    const res = await api
      .patch(`/sessions/${body.sessionId}`)
      .set(internalAuthHeader())
      .send({ action: 'complete' })
      .expect(200);
    expect(res.body.status).toBe('COMPLETED');
  });

  it('abandon 액션 → status=ABANDONED', async () => {
    const user = await makeUser();
    const { body } = await prepareAndStartSession(user.id, user.dongCode!);
    const res = await api
      .patch(`/sessions/${body.sessionId}`)
      .set(internalAuthHeader())
      .send({ action: 'abandon' })
      .expect(200);
    expect(res.body.status).toBe('ABANDONED');
  });
});
