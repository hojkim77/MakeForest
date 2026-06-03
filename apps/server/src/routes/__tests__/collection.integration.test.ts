import supertest from 'supertest';
import { app } from '../../app';
import { truncateAll, getTestPrisma } from '../../__tests__/helpers/testDb';

const api = supertest(app);

beforeEach(async () => {
  await truncateAll();
});

describe('GET /collection/today', () => {
  it('처음 조회 시 lazy 생성 → 200', async () => {
    const res = await api.get('/collection/today?regionCode=11680').expect(200);
    expect(res.body.targetCount).toBeGreaterThan(0);
    expect(res.body.currentCount).toBe(0);
    expect(res.body.isCompleted).toBe(false);
    expect(typeof res.body.creatureType).toBe('string');
  });

  it('같은 regionCode 재조회 → 동일한 creatureType 반환 (idempotent)', async () => {
    const r1 = await api.get('/collection/today?regionCode=11680').expect(200);
    const r2 = await api.get('/collection/today?regionCode=11680').expect(200);
    expect(r1.body.creatureType).toBe(r2.body.creatureType);
  });
});

describe('GET /collection/completed', () => {
  it('완료된 컬렉션 없으면 빈 배열', async () => {
    const res = await api.get('/collection/completed?regionCode=11680').expect(200);
    expect(res.body).toEqual([]);
  });

  it('완료된 컬렉션 있으면 포함', async () => {
    const prisma = getTestPrisma();
    await prisma.dailyCollection.create({
      data: {
        regionCode: '11680',
        date: '2024-01-01',
        creatureType: 'MUSHROOM',
        targetCount: 1,
        currentCount: 1,
        isCompleted: true,
        completedAt: new Date('2024-01-01'),
      },
    });
    const res = await api.get('/collection/completed?regionCode=11680').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].creatureType).toBe('MUSHROOM');
  });
});
