import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { deleteSession, removeActiveDong } from '@makeforest/redis';
import { regionOf } from '@makeforest/types';
import { requireInternalAuth } from '../middleware/auth';
import { runMidnightBatch } from '../cron/midnight';

export const testRouter = Router();

// 동 테이블이 비어 있을 때(CI 초기 환경) 사용하는 폴백 코드 목록
const FALLBACK_DONG_CODES = [
  '1168010100', // 강남구 역삼1동
  '1147010100', // 마포구 공덕동
  '1114010100', // 종로구 청운효자동
  '1130010100', // 동대문구 용신동
  '1121510100', // 노원구 월계1동
];

// POST /test/login — 부하 테스트용
// testId 기반으로 User 레코드를 upsert하고 x-internal-secret에 쓸 secret 반환
// users.json 없이 k6가 직접 호출해 유저를 생성할 수 있도록 설계
testRouter.post('/login', async (req: Request, res: Response) => {
  const { testId } = req.body as { testId: string };

  if (!testId) {
    return res.status(400).json({ error: 'testId required' });
  }

  try {
    // Dong 테이블에서 서울 동 코드 랜덤 선택, 비어 있으면 폴백 사용
    const dongs = await prisma.dong.findMany({
      where: { sidoCode: '11' },
      select: { code: true, name: true },
      take: 100,
    });

    const dongPool = dongs.length > 0
      ? dongs
      : FALLBACK_DONG_CODES.map((code) => ({ code, name: '서울특별시 강남구 역삼1동' }));

    const hash = testId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const selected = dongPool[hash % dongPool.length]!;
    const dongCode = selected.code;
    const regionCode = regionOf(dongCode, selected.name);

    const user = await prisma.user.upsert({
      where: { provider_providerId: { provider: 'test', providerId: testId } },
      update: {},
      create: {
        provider: 'test',
        providerId: testId,
        nickname: testId,
        dongCode,
      },
    });

    return res.json({
      userId: user.id,
      dongCode: user.dongCode ?? dongCode,
      regionCode,
      secret: process.env.INTERNAL_API_SECRET ?? '',
    });
  } catch (err) {
    console.error('[test] login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /test/complete-session — E2E 테스트용: 물주기 버튼 활성화 상태 세팅
// 오늘 날짜 FocusSession을 status=RUNNING, elapsedSec=1800으로 upsert → 프론트 물주기 가드 통과
testRouter.post('/complete-session', async (req: Request, res: Response) => {
  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { dongCode: true } });
    if (!user) return res.status(404).json({ error: 'user not found' });

    const today = new Date();
    today.setHours(today.getHours() + 9); // KST
    const date = today.toISOString().slice(0, 10);

    const session = await prisma.focusSession.upsert({
      where: { userId_date: { userId, date } },
      update: { status: 'RUNNING', totalElapsedSec: 1800 },
      create: { userId, dongCode: user.dongCode ?? '1168010100', date, status: 'RUNNING', totalElapsedSec: 1800 },
    });
    return res.json({ sessionId: session.id });
  } catch (err) {
    console.error('[test] complete-session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /test/run-midnight — 자정 배치 수동 실행 (검증용)
testRouter.post('/run-midnight', requireInternalAuth, async (_req: Request, res: Response) => {
  try {
    await runMidnightBatch();
    return res.json({ ok: true });
  } catch (err) {
    console.error('[test] run-midnight error:', err);
    return res.status(500).json({ error: 'batch failed' });
  }
});

// DELETE /test/cleanup — 로컬 부하 테스트 후 수동 정리용
// Docker 환경(CI/로컬)에서는 down으로 전체 정리되므로 주로 수동 실행 시 사용
testRouter.delete('/cleanup', requireInternalAuth, async (_req: Request, res: Response) => {
  try {
    const testUsers = await prisma.user.findMany({
      where: { provider: 'test' },
      select: { id: true },
    });

    if (testUsers.length === 0) {
      return res.json({ cleaned: 0 });
    }

    const testUserIds = testUsers.map((u) => u.id);

    const runningSessions = await prisma.focusSession.findMany({
      where: {
        userId: { in: testUserIds },
        status: 'RUNNING',
      },
      select: { id: true, dongCode: true },
    });

    for (const session of runningSessions) {
      await deleteSession(session.id);
      await removeActiveDong(session.dongCode, session.id);
    }

    await prisma.focusSession.updateMany({
      where: {
        userId: { in: testUserIds },
        status: 'RUNNING',
      },
      data: { status: 'COMPLETED' },
    });

    return res.json({ cleaned: runningSessions.length });
  } catch (err) {
    console.error('[test] cleanup error:', err);
    return res.status(500).json({ error: 'cleanup failed' });
  }
});
