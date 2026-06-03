import supertest from 'supertest';
import { app } from '../../app';
import { truncateAll, getTestPrisma } from '../../__tests__/helpers/testDb';
import { makeUser, makeFocusSession } from '../../__tests__/helpers/factories';
import { internalAuthHeader } from '../../__tests__/helpers/auth';

const api = supertest(app);

beforeEach(async () => {
  await truncateAll();
});

describe('POST /sessions — 세션 시작', () => {
  it('새 세션 생성 → sessionId 반환, isNewSession=true', async () => {
    const user = await makeUser();
    const res = await api
      .post('/sessions')
      .set(internalAuthHeader())
      .send({ userId: user.id, dongCode: user.dongCode, todos: [] })
      .expect(200);

    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.isNewSession).toBe(true);
    expect(res.body.startedAt).toBeTruthy();
  });

  it('기존 세션 있으면 isNewSession=false (upsert)', async () => {
    const user = await makeUser();
    // Pre-create session with createdAt in the past to guarantee isNewSession=false
    const session = await makeFocusSession(user.id, { status: 'IDLE' });
    await getTestPrisma().$executeRaw`
      UPDATE "FocusSession" SET "createdAt" = NOW() - INTERVAL '10 seconds' WHERE id = ${session.id}
    `;
    const res = await api
      .post('/sessions')
      .set(internalAuthHeader())
      .send({ userId: user.id, dongCode: user.dongCode, todos: [] })
      .expect(200);
    expect(res.body.isNewSession).toBe(false);
  });

  it('인증 없으면 401', async () => {
    await api.post('/sessions').send({ userId: 'x', dongCode: '1168010100', todos: [] }).expect(401);
  });
});

describe('GET /sessions/today', () => {
  it('세션 없으면 404', async () => {
    const user = await makeUser();
    await api
      .get(`/sessions/today?userId=${user.id}`)
      .set(internalAuthHeader())
      .expect(404);
  });

  it('세션 생성 후 조회 → 200', async () => {
    const user = await makeUser();
    await api.post('/sessions').set(internalAuthHeader()).send({ userId: user.id, dongCode: user.dongCode, todos: [] });
    await api
      .get(`/sessions/today?userId=${user.id}`)
      .set(internalAuthHeader())
      .expect(200);
  });
});

describe('GET /sessions/:id', () => {
  it('존재하는 세션 → 200', async () => {
    const user = await makeUser();
    const { body } = await api
      .post('/sessions')
      .set(internalAuthHeader())
      .send({ userId: user.id, dongCode: user.dongCode, todos: [] });
    await api.get(`/sessions/${body.sessionId}`).set(internalAuthHeader()).expect(200);
  });

  it('없는 세션 → 404', async () => {
    await api.get('/sessions/nonexistent-id').set(internalAuthHeader()).expect(404);
  });
});

describe('PATCH /sessions/:id — 상태 변경', () => {
  it('complete 액션 → status=COMPLETED', async () => {
    const user = await makeUser();
    const { body } = await api
      .post('/sessions')
      .set(internalAuthHeader())
      .send({ userId: user.id, dongCode: user.dongCode, todos: [] });
    const res = await api
      .patch(`/sessions/${body.sessionId}`)
      .set(internalAuthHeader())
      .send({ action: 'complete' })
      .expect(200);
    expect(res.body.status).toBe('COMPLETED');
  });

  it('abandon 액션 → status=ABANDONED', async () => {
    const user = await makeUser();
    const { body } = await api
      .post('/sessions')
      .set(internalAuthHeader())
      .send({ userId: user.id, dongCode: user.dongCode, todos: [] });
    const res = await api
      .patch(`/sessions/${body.sessionId}`)
      .set(internalAuthHeader())
      .send({ action: 'abandon' })
      .expect(200);
    expect(res.body.status).toBe('ABANDONED');
  });
});
