import supertest from 'supertest';
import { app } from '../../app';
import { truncateAll } from '../../__tests__/helpers/testDb';
import { makeUser, makeFriendship } from '../../__tests__/helpers/factories';
import { internalAuthHeader } from '../../__tests__/helpers/auth';

const api = supertest(app);

beforeEach(async () => {
  await truncateAll();
});

describe('POST /pokes — 찌르기', () => {
  it('친구 관계 아닌 경우 → 403', async () => {
    const [a, b] = await Promise.all([makeUser({ points: 10 }), makeUser()]);
    await api
      .post('/pokes')
      .set(internalAuthHeader())
      .send({ userId: a.id, toUserId: b.id })
      .expect(403);
  });

  it('포인트 부족(0점) → 402', async () => {
    const [a, b] = await Promise.all([makeUser({ points: 0 }), makeUser()]);
    await makeFriendship(a.id, b.id);
    await api
      .post('/pokes')
      .set(internalAuthHeader())
      .send({ userId: a.id, toUserId: b.id })
      .expect(402);
  });

  it('happy path → 200 + pointsRemaining = 초기포인트 - 2', async () => {
    const [a, b] = await Promise.all([makeUser({ points: 10 }), makeUser()]);
    await makeFriendship(a.id, b.id);
    const res = await api
      .post('/pokes')
      .set(internalAuthHeader())
      .send({ userId: a.id, toUserId: b.id })
      .expect(200);
    expect(res.body.pointsRemaining).toBe(8);
    expect(res.body.cooldownEndsAt).toBeTruthy();
  });

  it('쿨다운 중 재찌르기 → 409 + cooldownEndsAt', async () => {
    const [a, b] = await Promise.all([makeUser({ points: 20 }), makeUser()]);
    await makeFriendship(a.id, b.id);
    await api.post('/pokes').set(internalAuthHeader()).send({ userId: a.id, toUserId: b.id });
    const res = await api
      .post('/pokes')
      .set(internalAuthHeader())
      .send({ userId: a.id, toUserId: b.id })
      .expect(409);
    expect(res.body.cooldownEndsAt).toBeTruthy();
  });

  it('자기 자신 찌르기 → 400', async () => {
    const user = await makeUser({ points: 10 });
    await api
      .post('/pokes')
      .set(internalAuthHeader())
      .send({ userId: user.id, toUserId: user.id })
      .expect(400);
  });
});

describe('GET /pokes/inbox', () => {
  it('빈 받은함 → unreadCount=0, items=[]', async () => {
    const user = await makeUser();
    const res = await api
      .get(`/pokes/inbox?userId=${user.id}`)
      .set(internalAuthHeader())
      .expect(200);
    expect(res.body.unreadCount).toBe(0);
    expect(res.body.items).toEqual([]);
  });
});

describe('POST /pokes/inbox/read', () => {
  it('읽음 처리 → markedCount 반환', async () => {
    const user = await makeUser();
    const res = await api
      .post('/pokes/inbox/read')
      .set(internalAuthHeader())
      .send({ userId: user.id })
      .expect(200);
    expect(typeof res.body.markedCount).toBe('number');
  });
});
