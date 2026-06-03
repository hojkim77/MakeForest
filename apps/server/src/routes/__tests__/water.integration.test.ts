import supertest from 'supertest';
import { app } from '../../app';
import { truncateAll } from '../../__tests__/helpers/testDb';
import { makeUser, makeFocusSession } from '../../__tests__/helpers/factories';
import { internalAuthHeader } from '../../__tests__/helpers/auth';

const api = supertest(app);

beforeEach(async () => {
  await truncateAll();
});

describe('POST /water — 인증', () => {
  it('x-internal-secret 헤더 없으면 401', async () => {
    await api
      .post('/water')
      .send({ userId: 'x', dongCode: '1168010100', nickname: '테스터' })
      .expect(401);
  });
});

describe('POST /water — 물주기 happy path', () => {
  it('첫 물주기 → myWaterCount=1, totalWaterCount=1, stage=0', async () => {
    const user = await makeUser();
    const res = await api
      .post('/water')
      .set(internalAuthHeader())
      .send({ userId: user.id, dongCode: user.dongCode, nickname: user.nickname })
      .expect(200);

    expect(res.body.myWaterCount).toBe(1);
    expect(res.body.userCreature.totalWaterCount).toBe(1);
    expect(res.body.userCreature.stage).toBe(0);
  });

  it('두 번 물주기 → myWaterCount=2', async () => {
    const user = await makeUser();
    const body = { userId: user.id, dongCode: user.dongCode, nickname: user.nickname };
    await api.post('/water').set(internalAuthHeader()).send(body);
    const res = await api.post('/water').set(internalAuthHeader()).send(body).expect(200);
    expect(res.body.myWaterCount).toBe(2);
  });
});

describe('POST /water — 일일 한도', () => {
  it('오늘 waterCount=12이면 409 반환', async () => {
    const user = await makeUser();
    await makeFocusSession(user.id, { waterCount: 12, status: 'IDLE' });

    await api
      .post('/water')
      .set(internalAuthHeader())
      .send({ userId: user.id, dongCode: user.dongCode, nickname: user.nickname })
      .expect(409);
  });

  it('한도 1회 남은 상태에서 동시 요청 5개 → 정확히 1개만 200, 나머지 409', async () => {
    const user = await makeUser();
    await makeFocusSession(user.id, { waterCount: 11, status: 'IDLE' });

    const body = { userId: user.id, dongCode: user.dongCode, nickname: user.nickname };
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        api.post('/water').set(internalAuthHeader()).send(body),
      ),
    );

    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(4);
  });
});
