import supertest from 'supertest';
import { app } from '../../app';
import { truncateAll } from '../../__tests__/helpers/testDb';
import { makeUser, makeFriendship } from '../../__tests__/helpers/factories';
import { internalAuthHeader } from '../../__tests__/helpers/auth';

const api = supertest(app);

beforeEach(async () => {
  await truncateAll();
});

describe('POST /friends/requests — 친구 요청', () => {
  it('새 친구 요청 → { status: PENDING, friendshipId }', async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    const res = await api
      .post('/friends/requests')
      .set(internalAuthHeader())
      .send({ userId: a.id, targetUserId: b.id })
      .expect(200);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.friendshipId).toBeTruthy();
  });

  it('자기 자신에게 요청 → 400', async () => {
    const user = await makeUser();
    await api
      .post('/friends/requests')
      .set(internalAuthHeader())
      .send({ userId: user.id, targetUserId: user.id })
      .expect(400);
  });

  it('중복 요청 → 409', async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    await api.post('/friends/requests').set(internalAuthHeader()).send({ userId: a.id, targetUserId: b.id });
    await api
      .post('/friends/requests')
      .set(internalAuthHeader())
      .send({ userId: a.id, targetUserId: b.id })
      .expect(409);
  });

  it('역방향 PENDING 요청 → 자동 수락 { status: ACCEPTED }', async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    await api.post('/friends/requests').set(internalAuthHeader()).send({ userId: a.id, targetUserId: b.id });
    const res = await api
      .post('/friends/requests')
      .set(internalAuthHeader())
      .send({ userId: b.id, targetUserId: a.id })
      .expect(200);
    expect(res.body.status).toBe('ACCEPTED');
  });
});

describe('PATCH /friends/requests/:id — 요청 수락/거절', () => {
  it('수락 → 200 ok', async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    const { body } = await api
      .post('/friends/requests')
      .set(internalAuthHeader())
      .send({ userId: a.id, targetUserId: b.id });
    await api
      .patch(`/friends/requests/${body.friendshipId}`)
      .set(internalAuthHeader())
      .send({ userId: b.id, action: 'accept' })
      .expect(200);
  });

  it('거절 → 200 ok', async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    const { body } = await api
      .post('/friends/requests')
      .set(internalAuthHeader())
      .send({ userId: a.id, targetUserId: b.id });
    await api
      .patch(`/friends/requests/${body.friendshipId}`)
      .set(internalAuthHeader())
      .send({ userId: b.id, action: 'reject' })
      .expect(200);
  });

  it('addressee가 아닌 유저가 수락 시도 → 403', async () => {
    const [a, b, c] = await Promise.all([makeUser(), makeUser(), makeUser()]);
    const { body } = await api
      .post('/friends/requests')
      .set(internalAuthHeader())
      .send({ userId: a.id, targetUserId: b.id });
    await api
      .patch(`/friends/requests/${body.friendshipId}`)
      .set(internalAuthHeader())
      .send({ userId: c.id, action: 'accept' })
      .expect(403);
  });
});

describe('DELETE /friends/:targetUserId — 친구 삭제', () => {
  it('친구 삭제 → 200', async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    await makeFriendship(a.id, b.id);
    await api
      .delete(`/friends/${b.id}`)
      .set(internalAuthHeader())
      .send({ userId: a.id })
      .expect(200);
  });

  it('친구 아닌 경우 → 404', async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    await api
      .delete(`/friends/${b.id}`)
      .set(internalAuthHeader())
      .send({ userId: a.id })
      .expect(404);
  });
});

describe('GET /friends — 친구 목록', () => {
  it('친구 없으면 빈 배열', async () => {
    const user = await makeUser();
    const res = await api
      .get(`/friends?userId=${user.id}`)
      .set(internalAuthHeader())
      .expect(200);
    expect(res.body.friends).toEqual([]);
  });

  it('수락된 친구 포함', async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    await makeFriendship(a.id, b.id);
    const res = await api
      .get(`/friends?userId=${a.id}`)
      .set(internalAuthHeader())
      .expect(200);
    expect(res.body.friends).toHaveLength(1);
    expect(res.body.friends[0].userId).toBe(b.id);
  });
});
